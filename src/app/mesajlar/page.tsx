'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Ban,
  ArrowLeft,
  X,
  Image as ImageIcon,
  AlertCircle,
  Eye,
  Info,
  Lock,
} from 'lucide-react';
import {
  DemoConversation,
  getConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
  reportMessage,
  blockUser,
} from '@/lib/services/message-service';
import {
  checkRevealStatus,
  reportFalsePositive,
  canRevealByPhoneNumber,
  logPhoneReveal,
  RevealedContactDetails,
} from '@/lib/services/reveal-service';
import RevealedContactCard from '@/components/common/RevealedContactCard';
import { Message } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<DemoConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Controlled Reveal State
  const [revealedDetails, setRevealedDetails] = useState<RevealedContactDetails | null>(null);
  const [checkingReveal, setCheckingReveal] = useState(false);
  const [softQuota, setSoftQuota] = useState<{ allowed: boolean; remaining: number }>({
    allowed: true,
    remaining: 3,
  });

  // Attachment & Report modals
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('iletisim_paylasimi');
  const [reportDetails, setReportDetails] = useState('');
  const [targetMsgId, setTargetMsgId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  // False positive dispute modal
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeTargetLogId, setDisputeTargetLogId] = useState<string>('comp-log-dispute');
  const [disputeNote, setDisputeNote] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState('buyer-demo-001');

  // Load real authenticated user if available, fallback to demo
  useEffect(() => {
    async function initUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      } catch {
        // fallback to default demo user
      }
    }
    initUser();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const convs = await getConversations(currentUserId);
    setConversations(convs);
    if (convs.length > 0 && !selectedConvId) {
      setSelectedConvId(convs[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  const activeConv = conversations.find((c) => c.id === selectedConvId);

  // Load messages and check contact reveal status whenever active conversation changes
  useEffect(() => {
    if (selectedConvId && activeConv) {
      getMessages(selectedConvId).then((msgs) => {
        setMessages(msgs);
        markConversationAsRead(selectedConvId, currentUserId);
      });

      setCheckingReveal(true);
      checkRevealStatus(activeConv.buyer_id, activeConv.company_id).then((status) => {
        if (status.revealed && status.details) {
          setRevealedDetails(status.details);
        } else {
          setRevealedDetails(null);
        }
        setCheckingReveal(false);
      });

      canRevealByPhoneNumber(currentUserId).then((res) => {
        setSoftQuota({ allowed: res.allowed, remaining: res.remainingDaily });
      });
    }
  }, [selectedConvId, activeConv, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachmentPreview) || !selectedConvId) return;

    const res = await sendMessage(
      selectedConvId,
      currentUserId,
      inputText,
      attachmentPreview
    );

    if (res.success && res.message) {
      setMessages((prev) => [...prev, res.message!]);
      setInputText('');
      setAttachmentPreview(null);

      // If message contained unapproved contact details and was masked
      if (res.isMasked) {
        setActionNotice(
          res.infoNotice ||
            'İletişim bilgisi tespit edildi ve maskelendi. Teklif onaylandıktan sonra bilgiler her iki tarafa otomatik açılacaktır.'
        );
        setTimeout(() => setActionNotice(''), 5000);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Fotoğraf boyutu 5 MB üzerinde olamaz.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConvId) return;
    if (confirm('Bu kullanıcıyı engellemek istediğinize emin misiniz?')) {
      await blockUser(selectedConvId, currentUserId);
      setActionNotice('Kullanıcı engellendi.');
      setMenuOpen(false);
      setTimeout(() => setActionNotice(''), 3000);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMsgId) return;
    const fullReason = `${reportReason}: ${reportDetails || 'Açıklama belirtilmedi'}`;
    await reportMessage(targetMsgId, currentUserId, fullReason);
    setReportModalOpen(false);
    setReportDetails('');
    setActionNotice('Şikayetiniz inceleme ekibimize başarıyla iletildi.');
    setTimeout(() => setActionNotice(''), 3500);
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await reportFalsePositive(
      disputeTargetLogId,
      disputeNote || 'Bu bir iletişim bilgisi değildir (Fiyat / Tonaj / Model kodu vb.)'
    );
    setDisputeModalOpen(false);
    setDisputeNote('');
    setActionNotice('İtirazınız admin moderasyon kuyruğuna iletildi. İnceleme sonrası düzeltilecektir.');
    setTimeout(() => setActionNotice(''), 4500);
  };

  const handleSoftModeReveal = async () => {
    if (!activeConv) return;
    if (!confirm('Firmanın iletişim bilgilerini görüntülemek istiyor musunuz? (Bugün kalan hakkınız düşülecektir)')) return;

    const res = await logPhoneReveal(currentUserId, activeConv.company_id, activeConv.listing_title || '');
    if (!res.success) {
      alert(res.error || 'Numara görüntüleme kotanız doldu.');
      return;
    }

    const status = await checkRevealStatus(activeConv.buyer_id, activeConv.company_id);
    if (status.revealed && status.details) {
      setRevealedDetails(status.details);
    }
    setSoftQuota((prev) => ({ ...prev, remaining: prev.remaining - 1 }));
    setActionNotice(`İletişim bilgileri açıldı. Bugün kalan hakkınız: ${softQuota.remaining - 1}`);
    setTimeout(() => setActionNotice(''), 4000);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    return (
      c.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.listing_title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="bg-slate-100 min-h-[calc(100vh-80px)] py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Notice alert */}
        {actionNotice && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[750px] flex">
          {/* Left Column: Conversation List */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 ${
              selectedConvId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* List Header */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <h1 className="font-black text-navy-900 text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                  Mesajlarım
                </h1>
                <span className="text-xs bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">
                  {conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0)} Okunmamış
                </span>
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Kullanıcı veya ilan ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Yükleniyor...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Konuşma bulunamadı.</div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === selectedConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`p-3.5 sm:p-4 cursor-pointer transition ${
                        isSelected ? 'bg-orange-50/70 border-l-4 border-l-orange-500' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs sm:text-sm text-navy-900 line-clamp-1">
                          {conv.other_user_name}
                        </div>
                        {conv.last_message_at && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(conv.last_message_at).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      {conv.listing_title && (
                        <div className="text-[11px] font-semibold text-orange-700 line-clamp-1 mt-0.5">
                          {conv.listing_title}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {conv.last_message || 'Yeni konuşma'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat View */}
          <div
            className={`flex-1 flex flex-col bg-slate-50 ${
              !selectedConvId ? 'hidden md:flex items-center justify-center' : 'flex'
            }`}
          >
            {activeConv ? (
              <>
                {/* Active Chat Header */}
                <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedConvId(null)}
                      className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="font-extrabold text-navy-900 text-sm sm:text-base leading-tight">
                        {activeConv.other_user_name}
                      </h2>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        {activeConv.listing_title && (
                          <span className="font-semibold text-orange-600 line-clamp-1">
                            İlgili İlan: {activeConv.listing_title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="relative flex items-center gap-2">
                    {/* Soft Mode "Numarayı Göster" button if available and not yet revealed */}
                    {!revealedDetails && softQuota.allowed && (
                      <button
                        type="button"
                        onClick={handleSoftModeReveal}
                        title={`Bugün kalan hak: ${softQuota.remaining}`}
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Numarayı Göster ({softQuota.remaining})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="p-2 rounded-xl text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-20 text-xs">
                        <button
                          type="button"
                          onClick={handleBlockUser}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2"
                        >
                          <Ban className="w-4 h-4" />
                          Kullanıcıyı Engelle
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Safety Banner / Revealed Contact Card */}
                {revealedDetails ? (
                  <div className="p-3 bg-slate-100 border-b border-slate-200">
                    <RevealedContactCard details={revealedDetails} />
                  </div>
                ) : (
                  <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-[11px] font-medium leading-tight">
                        <strong>İletişim Bilgileri Korumalı:</strong> Telefon ve açık adres, teklif veya rezervasyon kabul edildikten sonra otomatik açılır.
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold shrink-0">
                      Güvenli Mesajlaşma
                    </span>
                  </div>
                )}

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      Henüz mesaj yok. İlk mesajı yazarak iletişime geçebilirsiniz.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === currentUserId;
                      const isMaskedMessage = (m.body || '').includes('[iletişim bilgisi gizlendi]');

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-2.5 shadow-sm text-xs sm:text-sm ${
                              isMe
                                ? 'bg-navy-900 text-white rounded-tr-none'
                                : 'bg-white text-navy-900 border border-slate-200 rounded-tl-none'
                            }`}
                          >
                            {m.attachment_url && (
                              <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                                <img
                                  src={m.attachment_url}
                                  alt="Ek görsel"
                                  className="w-full max-h-60 object-cover"
                                />
                              </div>
                            )}

                            <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>

                            {/* Masked Content Notice & False Positive Dispute Button */}
                            {isMaskedMessage && (
                              <div className="mt-2 pt-2 border-t border-slate-200/40 text-[10px] flex flex-wrap items-center justify-between gap-2">
                                <span className={`${isMe ? 'text-amber-300' : 'text-amber-700'} font-semibold flex items-center gap-1`}>
                                  <Lock className="w-3 h-3 shrink-0" />
                                  İletişim bilgisi güvenlik gereği maskelendi.
                                </span>
                                {isMe && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDisputeTargetLogId(`log-msg-${m.id}`);
                                      setDisputeModalOpen(true);
                                    }}
                                    className={`underline font-bold transition ${
                                      isMe ? 'text-slate-200 hover:text-white' : 'text-slate-500 hover:text-navy-900'
                                    }`}
                                  >
                                    Bu bir iletişim bilgisi değil
                                  </button>
                                )}
                              </div>
                            )}

                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                isMe ? 'text-slate-300' : 'text-slate-400'
                              }`}
                            >
                              <span>
                                {new Date(m.created_at).toLocaleTimeString('tr-TR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isMe && (
                                <span>
                                  {m.is_read ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-orange-400" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetMsgId(m.id);
                                setReportModalOpen(true);
                              }}
                              className="text-[10px] text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition mt-0.5 flex items-center gap-1"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              Şikayet Et
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attachment Preview Strip */}
                {attachmentPreview && (
                  <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={attachmentPreview}
                        alt="Önizleme"
                        className="w-12 h-12 rounded-lg object-cover border"
                      />
                      <span className="text-xs text-slate-600 font-semibold">Görsel eklendi</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachmentPreview(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <form
                  onSubmit={handleSend}
                  className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <label className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-navy-900 hover:bg-slate-100 cursor-pointer transition">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Paperclip className="w-4 h-4" />
                  </label>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Mesajınızı yazın... (Teklif onayına kadar telefon/IBAN maskelenir)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() && !attachmentPreview}
                    className="p-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm transition disabled:opacity-40 flex items-center gap-2 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">GÖNDER</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center p-8 space-y-2 text-slate-400">
                <MessageSquare className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
                <h3 className="font-bold text-navy-900 text-base">Bir konuşma seçin</h3>
                <p className="text-xs">Sol taraftaki listeden mesajlaşmayı başlatabilirsiniz.</p>
              </div>
            )}
          </div>
        </div>

        {/* Report Modal */}
        {reportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-navy-900 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  Mesajı / Kullanıcıyı Şikayet Et
                </h3>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-navy-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Şikayet Nedeni:
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="iletisim_paylasimi">Telefon / E-posta / Harici İletişim Paylaşma Çabası</option>
                    <option value="fotografta_iletisim">Fotoğrafta Telefon / İletişim Bilgisi Var</option>
                    <option value="harici_odeme">Platform Dışı Elden Anlaşma / Kaparo Talebi</option>
                    <option value="kural_disi">Kural Dışı Teklif veya Fiyat Uyuşmazlığı</option>
                    <option value="uygunsuz_dil">Hakaret / Tehdit / Uygunsuz Dil</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ek Açıklama (İsteğe Bağlı):
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Durumu kısaca açıklayınız..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
                  >
                    Şikayeti İlet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* False Positive Dispute Modal ("Bu bir iletişim bilgisi değil") */}
        {disputeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-navy-900 text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-orange-500" />
                  Hatalı Maskeleme Bildirimi
                </h3>
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-navy-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Yazdığınız mesajda fiyat, metraj, tonaj veya makine parça kodu yanlışlıkla iletişim bilgisi gibi algılandıysa bize bildirebilirsiniz. Moderatörlerimiz güvenlik algoritmasını hızla düzeltecektir.
              </p>

              <form onSubmit={handleDisputeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    İtiraz Notunuz:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={disputeNote}
                    onChange={(e) => setDisputeNote(e.target.value)}
                    placeholder="Örnek: '320D bir CAT ekskavatör model kodudur, telefon numarası değildir.'"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setDisputeModalOpen(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold shadow-sm"
                  >
                    İnceleme Talep Et
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
