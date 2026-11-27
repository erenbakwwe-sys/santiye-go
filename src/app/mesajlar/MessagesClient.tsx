'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  startConversation,
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
import { getActiveProfile } from '@/lib/services/auth-service';

export default function MessagesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<DemoConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Platform Güvenlik & Harici Ödeme Uyarısı Modalı (2. Sorun)
  const [showPaymentWarningModal, setShowPaymentWarningModal] = useState(false);

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('Kullanıcı');

  // Güvenlik uyarısı modal durumunu kontrol et
  useEffect(() => {
    try {
      const accepted = localStorage.getItem('santiyego_payment_warning_accepted');
      if (!accepted) {
        setShowPaymentWarningModal(true);
      }
    } catch {}
  }, []);

  const handleAcceptPaymentWarning = () => {
    try {
      localStorage.setItem('santiyego_payment_warning_accepted', 'true');
    } catch {}
    setShowPaymentWarningModal(false);
  };

  // Authenticate user: Giriş yapmamış kullanıcıyı koru ve yönlendir
  useEffect(() => {
    async function initUser() {
      try {
        const activeProfile = await getActiveProfile();
        if (activeProfile?.id) {
          setCurrentUserId(activeProfile.id);
          setCurrentUserName(activeProfile.full_name || 'Kullanıcı');
          setIsAuthenticating(false);
          return;
        }

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id) {
          setCurrentUserId(user.id);
          setCurrentUserName(user.user_metadata?.full_name || user.email || 'Kullanıcı');
          setIsAuthenticating(false);
        } else {
          // Giriş yapılmamışsa doğrudan giriş sayfasına yönlendir
          setIsAuthenticating(false);
          router.replace('/giris?redirect=/mesajlar');
        }
      } catch {
        setIsAuthenticating(false);
        router.replace('/giris?redirect=/mesajlar');
      }
    }
    initUser();
  }, [router]);

  const loadData = async (
    targetCompanyId?: string | null,
    targetBuyerId?: string | null,
    targetListingId?: string | null,
    targetListingTitle?: string | null,
    targetCompanyName?: string | null,
    targetBuyerName?: string | null
  ) => {
    if (!currentUserId) return;
    setLoading(true);

    try {
      let convs = await getConversations(currentUserId);

      // Eğer URL'den firma, ilan veya alıcı hedefi ile gelinmişse otomatik konuşma bul veya oluştur
      if (targetListingId || targetCompanyId || targetBuyerId) {
        const otherId = targetCompanyId || targetBuyerId;
        const matched = convs.find(
          (c) =>
            (targetListingId && c.listing_id === targetListingId) ||
            (otherId && (c.company_id === otherId || c.buyer_id === otherId || c.seller_id === otherId || c.other_user_id === otherId))
        );

        if (matched) {
          setSelectedConvId(matched.id);
        } else {
          // Yeni konuşma başlat veya veritabanından çek (sunucu RPC)
          const initRes = await startConversation({
            listingId: targetListingId || undefined,
            companyId: targetCompanyId || undefined,
            listingTitle: targetListingTitle || undefined,
            companyName: targetCompanyName || undefined,
          });

          if (initRes.success && initRes.conversationId) {
            convs = await getConversations(currentUserId);
            setSelectedConvId(initRes.conversationId);
          } else if (initRes.error) {
            setActionNotice(initRes.error);
          }
        }
      } else if (convs.length > 0 && !selectedConvId) {
        setSelectedConvId(convs[0].id);
      }

      setConversations(convs);
    } catch (err: any) {
      console.error('[MessagesClient] loadData error:', err);
      setActionNotice(err?.message || 'Konuşmalar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      const companyId = searchParams.get('companyId');
      const buyerId = searchParams.get('buyerId');
      const listingId = searchParams.get('listingId');
      const listingTitle = searchParams.get('listingTitle');
      const companyName = searchParams.get('companyName');
      const buyerName = searchParams.get('buyerName');
      loadData(companyId, buyerId, listingId, listingTitle, companyName, buyerName);
    }
  }, [currentUserId, searchParams, currentUserName]);

  const activeConv = conversations.find((c) => c.id === selectedConvId);

  // Load messages and check contact reveal status whenever active conversation changes
  useEffect(() => {
    if (selectedConvId && currentUserId) {
      getMessages(selectedConvId).then((msgs) => {
        setMessages(msgs);
        markConversationAsRead(selectedConvId, currentUserId);
      });

      const currentConv = conversations.find((c) => c.id === selectedConvId);
      if (currentConv) {
        setCheckingReveal(true);
        checkRevealStatus(currentConv.buyer_id, currentConv.company_id).then((status) => {
          if (status.revealed && status.details) {
            setRevealedDetails(status.details);
          } else {
            setRevealedDetails(null);
          }
          setCheckingReveal(false);
        });
      }

      canRevealByPhoneNumber(currentUserId).then((res) => {
        setSoftQuota({ allowed: res.allowed, remaining: res.remainingDaily });
      });
    }
  }, [selectedConvId, currentUserId]);

  // Canlı Realtime ve bağlantı durumu izleme
  useEffect(() => {
    if (!currentUserId) return;

    // 1. Supabase Realtime aboneliği
    const supabase = createClient();
    const channel = supabase
      .channel(`user_messages_${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && newMsg.conversation_id === selectedConvId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [
                ...prev,
                {
                  ...newMsg,
                  body: newMsg.content || newMsg.body,
                  content: newMsg.content || newMsg.body,
                },
              ];
            });

            // Gelen mesaj alıcıya aitse okundu işaretle
            if (selectedConvId && newMsg.sender_id !== currentUserId) {
              markConversationAsRead(selectedConvId, currentUserId);
            }
          }
          // Konuşma listesini de anında güncelle
          getConversations(currentUserId)
            .then((c) => setConversations(c))
            .catch(() => {});
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('disconnected');
        }
      });

    // 2. Yedek Polling (Realtime bağlantısı gecikir veya düşerse çalışır)
    const msgInterval = setInterval(async () => {
      if (selectedConvId) {
        try {
          const updatedMsgs = await getMessages(selectedConvId);
          setMessages((prev) => {
            if (updatedMsgs.length !== prev.length) {
              return updatedMsgs;
            }
            const hasChange = updatedMsgs.some(
              (m, idx) => !prev[idx] || prev[idx].id !== m.id || prev[idx].is_read !== m.is_read
            );
            if (hasChange) {
              return updatedMsgs;
            }
            return prev;
          });
        } catch {}
      }
    }, 4000);

    const convInterval = setInterval(async () => {
      try {
        const updatedConvs = await getConversations(currentUserId);
        setConversations(updatedConvs);
      } catch {}
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(msgInterval);
      clearInterval(convInterval);
    };
  }, [selectedConvId, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || (!inputText.trim() && !attachmentPreview) || !selectedConvId || !currentUserId) return;

    const currentText = inputText;
    const currentAttach = attachmentPreview;
    setIsSending(true);
    setInputText('');
    setAttachmentPreview(null);

    try {
      const res = await sendMessage(
        selectedConvId,
        currentUserId,
        currentText,
        currentAttach
      );

      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message!]);

        // Sol listedeki son mesajı güncelle
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConvId
              ? {
                  ...c,
                  last_message: res.message!.body || res.message!.content,
                  last_message_at: res.message!.created_at,
                }
              : c
          )
        );

        // If message contained unapproved contact details and was masked
        if (res.isMasked) {
          setActionNotice(
            res.infoNotice ||
              'İletişim bilgisi tespit edildi ve maskelendi. Teklif onaylandıktan sonra bilgiler her iki tarafa otomatik açılacaktır.'
          );
          setTimeout(() => setActionNotice(''), 6000);
        }
      } else {
        // Hata durumunda mesaj metnini geri yükle ve kullanıcıyı net bilgilendir
        setInputText(currentText);
        setAttachmentPreview(currentAttach);
        setActionNotice(res.error || 'Mesaj iletilemedi. Lütfen tekrar deneyiniz.');
        setTimeout(() => setActionNotice(''), 6000);
      }
    } catch (sendErr: any) {
      setInputText(currentText);
      setAttachmentPreview(currentAttach);
      setActionNotice(sendErr?.message || 'Mesaj iletilemedi. Ağ bağlantınızı kontrol ediniz.');
      setTimeout(() => setActionNotice(''), 6000);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Fotoğraf boyutu 10 MB üzerinde olamaz.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const rawResult = reader.result as string;
        // İstemci tarafı akıllı görsel optimizasyonu (hızlı yükleme ve hafif veri boyutu)
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setAttachmentPreview(canvas.toDataURL('image/jpeg', 0.75));
          } else {
            setAttachmentPreview(rawResult);
          }
        };
        img.onerror = () => {
          setAttachmentPreview(rawResult);
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBlockUser = async () => {
    if (!activeConv || !currentUserId) return;
    const targetUserId = activeConv.other_user_id || (activeConv.buyer_id === currentUserId ? activeConv.seller_id : activeConv.buyer_id);
    if (!targetUserId) {
      alert('Engellenecek kullanıcı kimliği tespit edilemedi.');
      return;
    }
    if (confirm('Bu kullanıcıyı engellemek istediğinize emin misiniz? Karşılıklı mesajlaşma engellenecektir.')) {
      const res = await blockUser(targetUserId);
      if (res.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvId ? { ...c, is_blocked: true } : c))
        );
        setActionNotice('Kullanıcı başarıyla engellendi.');
      } else {
        setActionNotice(res.error || 'Engelleme işlemi başarısız oldu.');
      }
      setMenuOpen(false);
      setTimeout(() => setActionNotice(''), 3500);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMsgId || !currentUserId) return;
    const res = await reportMessage(targetMsgId, currentUserId, reportReason, reportDetails);
    setReportModalOpen(false);
    setReportDetails('');
    if (res.success) {
      setActionNotice('Şikayetiniz moderatör ekibimize iletildi.');
    } else {
      setActionNotice(res.error || 'Şikayet iletilemedi.');
    }
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
    if (!activeConv || !currentUserId) return;
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

  if (isAuthenticating || !currentUserId) {
    return (
      <div className="bg-slate-100 min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-navy-900">Giriş Yapılması Gerekiyor</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Mesajlarınızı ve görüşmelerinizi görüntülemek için lütfen hesabınıza giriş yapın veya ücretsiz kayıt olun.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/giris?redirect=/mesajlar"
              className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Giriş Yap
            </Link>
            <Link
              href="/kayit"
              className="flex-1 py-2.5 px-4 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Daimi Güvenlik ve Ödeme Uyarı Şeridi */}
        <div className="mb-3 p-3 bg-white border border-amber-300 rounded-xl shadow-sm flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-900">
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="text-xs leading-tight font-medium">
              <strong className="font-bold text-navy-900">ŞantiyeGO Güvence Sistemi:</strong> Komisyon kaçağını önlemek ve dolandırıcılık mağduriyeti yaşamamak için tüm ödemeler platform üzerinden Havuz (Escrow) sistemiyle yapılmalıdır. Dışarıdan veya elden ödeme yapmayınız.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPaymentWarningModal(true)}
            className="text-xs text-orange-600 hover:text-orange-700 font-bold underline shrink-0 whitespace-nowrap"
          >
            Detayları Gör
          </button>
        </div>

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
                <div className="p-8 text-center text-xs text-slate-400">Konuşmalar yükleniyor...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Henüz bir konuşma bulunmuyor.</div>
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
                          <span className="text-xs text-slate-400 shrink-0">
                            {new Date(conv.last_message_at).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      {conv.listing_title && (
                        <div className="text-xs font-semibold text-orange-700 line-clamp-1 mt-0.5">
                          {conv.listing_title}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {conv.last_message || 'Yeni konuşma'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center shrink-0">
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
                      <div className="flex items-center gap-2">
                        <h2 className="font-extrabold text-navy-900 text-sm sm:text-base leading-tight">
                          {activeConv.other_user_name}
                        </h2>
                        {realtimeStatus === 'connected' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Canlı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Yenileniyor
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
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
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition"
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

                {/* Realtime Disconnected Indicator */}
                {realtimeStatus === 'disconnected' && (
                  <div className="bg-amber-100/90 border-b border-amber-300 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-3 font-semibold">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Canlı bağlantı koptu, yeniden bağlanılıyor... (Yedek yenileme devrede)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedConvId) getMessages(selectedConvId).then(setMessages);
                        if (currentUserId) getConversations(currentUserId).then(setConversations);
                      }}
                      className="underline text-amber-950 hover:text-black font-bold"
                    >
                      Şimdi Yenile
                    </button>
                  </div>
                )}

                {/* Top Safety Banner / Revealed Contact Card */}
                {activeConv.is_blocked ? (
                  <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-bold">
                      <Ban className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Bu kullanıcı engellenmiştir. Karşılıklı yeni mesaj gönderilemez.</span>
                    </div>
                  </div>
                ) : revealedDetails ? (
                  <div className="p-3 bg-slate-100 border-b border-slate-200">
                    <RevealedContactCard details={revealedDetails} />
                  </div>
                ) : (
                  <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-medium leading-tight">
                        <strong>İletişim Bilgileri Korumalı:</strong> Telefon ve açık adres, teklif veya rezervasyon kabul edildikten sonra otomatik açılır.
                      </span>
                    </div>
                    <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold shrink-0">
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
                      const msgText = m.body || m.content || '';
                      const isMaskedMessage = msgText.includes('[iletişim bilgisi gizlendi]');

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

                            <p className="leading-relaxed whitespace-pre-wrap">{msgText}</p>

                            {/* Masked Content Notice & False Positive Dispute Button */}
                            {isMaskedMessage && (
                              <div className="mt-2 pt-2 border-t border-slate-200/40 text-xs flex flex-wrap items-center justify-between gap-2">
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
                              className={`flex items-center justify-end gap-1 mt-1 text-xs ${
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
                              className="text-xs text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition mt-0.5 flex items-center gap-1"
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

                {/* Inline Action Notice (Hata / Bilgilendirme) */}
                {actionNotice && (
                  <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{actionNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActionNotice('')}
                      className="text-amber-700 hover:text-amber-900 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <form
                  onSubmit={handleSend}
                  className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2"
                >
                  <label
                    className={`p-2.5 rounded-xl border border-slate-200 text-slate-500 transition ${
                      activeConv.is_blocked
                        ? 'opacity-40 cursor-not-allowed bg-slate-100'
                        : 'hover:text-navy-900 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!!activeConv.is_blocked}
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Paperclip className="w-4 h-4" />
                  </label>

                  <input
                    type="text"
                    disabled={!!activeConv.is_blocked}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      activeConv.is_blocked
                        ? 'Bu konuşma engellenmiştir, mesaj gönderilemez.'
                        : 'Mesajınızı yazın... (Teklif onayına kadar telefon/IBAN maskelenir)'
                    }
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />

                  <button
                    type="submit"
                    disabled={isSending || activeConv.is_blocked || (!inputText.trim() && !attachmentPreview)}
                    className="p-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">{isSending ? 'GÖNDERİLİYOR...' : 'GÖNDER'}</span>
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

        {/* 2. SORUN ÇÖZÜMÜ: Platform Güvenliği ve Harici Ödeme Önleme Uyarısı Modalı */}
        {showPaymentWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-navy-900 text-base sm:text-lg leading-tight">
                    Güvenli Mesajlaşma & Ödeme Uyarısı
                  </h3>
                  <p className="text-xs text-amber-700 font-semibold mt-0.5">
                    Platform Dışı Ödeme ve Komisyon Kaçağı Önleme Kuralı
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>Dışarıdan Ödeme Kesinlikle Yasaktır!</span>
                  </div>
                  <p className="text-xs font-normal">
                    Şahsi IBAN&apos;a havale/EFT, elden nakit ödeme veya harici kaparo gönderilmesi platform kurallarımıza aykırıdır.
                  </p>
                </div>

                <ul className="space-y-2 list-disc list-inside text-slate-700">
                  <li>
                    <strong className="text-navy-900">Havuz Güvencesi:</strong> Ödemeleriniz ŞantiyeGO Havuz (Escrow) hesabında tutulur, iş veya teslimat onaylanana kadar firmaya aktarılmaz.
                  </li>
                  <li>
                    <strong className="text-navy-900">Mağduriyet Sorumluluğu:</strong> Platform dışından yapılan ödemeler güvence kapsamı dışındadır ve doğabilecek dolandırıcılık veya anlaşmazlıklardan ŞantiyeGO sorumlu tutulamaz.
                  </li>
                  <li>
                    <strong className="text-navy-900">Hesap Kapatma Cezası:</strong> Komisyon kaçağı ve sistem dışı işlem teklifinde bulunan kullanıcı ve firmaların hesapları süresiz askıya alınır.
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleAcceptPaymentWarning}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm tracking-wide transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Kuralları okudum, kabul ediyorum</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
