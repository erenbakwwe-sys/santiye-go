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
  Ban,
  ArrowLeft,
  X,
  Image as ImageIcon,
  AlertCircle,
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
import { Message } from '@/types/database';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<DemoConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Attachment & Report modals
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [targetMsgId, setTargetMsgId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = 'buyer-demo-001';

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
  }, []);

  useEffect(() => {
    if (selectedConvId) {
      getMessages(selectedConvId).then((msgs) => {
        setMessages(msgs);
        markConversationAsRead(selectedConvId, currentUserId);
      });
    }
  }, [selectedConvId]);

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
    if (!targetMsgId || !reportReason) return;
    await reportMessage(targetMsgId, currentUserId, reportReason);
    setReportModalOpen(false);
    setReportReason('');
    setActionNotice('Şikayetiniz inceleme ekibimize iletildi.');
    setTimeout(() => setActionNotice(''), 3000);
  };

  const activeConv = conversations.find((c) => c.id === selectedConvId);

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
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-2">
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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="p-2 rounded-xl text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {menuOpen && (
                      <div className="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-20 text-xs">
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

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      Henüz mesaj yok. İlk mesajı yazarak iletişime geçebilirsiniz.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === currentUserId;

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
                    placeholder="Mesajınızı yazın..."
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
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-extrabold text-navy-900 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  Mesajı Şikayet Et
                </h3>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-navy-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Şikayet Sebebi:
                </label>
                <textarea
                  rows={3}
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Kural dışı teklif, hakaret, spam vb."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold text-slate-600"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
                  >
                    Şikayeti Gönder
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
