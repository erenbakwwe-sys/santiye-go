'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Paperclip } from 'lucide-react';
import type { ConversationSummary, ThreadMessage } from '@/lib/services/admin-conversations';

interface ConversationDetail {
  id: string;
  createdAt: string;
  buyerName: string;
  companyName: string;
  listingId: string | null;
  listingTitle: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminConversationsPage() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState('');

  const loadList = useCallback(async (q: string, p: number) => {
    setListLoading(true);
    setListError('');
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set('q', q);
      const res = await fetch(`/api/admin/conversations?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Konuşmalar yüklenemedi.');
      setConversations(data.conversations);
      setTotal(data.total);
      setPageSize(data.pageSize);
    } catch (err) {
      setConversations([]);
      setTotal(0);
      setListError(err instanceof Error ? err.message : 'Konuşmalar yüklenemedi.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList(submittedQuery, page);
  }, [loadList, submittedQuery, page]);

  const openConversation = async (id: string) => {
    setActiveId(id);
    setThreadLoading(true);
    setThreadError('');
    setDetail(null);
    setMessages([]);
    try {
      const res = await fetch(`/api/admin/conversations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Konuşma yüklenemedi.');
      setDetail(data.conversation);
      setMessages(data.messages);
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : 'Konuşma yüklenemedi.');
    } finally {
      setThreadLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmittedQuery(query.trim());
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Yazışmalar</h1>
        <p className="text-sm text-slate-600 mt-1">
          Alıcı ile firma arasındaki konuşmalar. Yalnız okunur; açtığınız her konuşma denetim kaydına yazılır.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        {/* Konuşma listesi */}
        <section className="lg:col-span-2 bg-white rounded-lg border border-slate-200">
          <form onSubmit={handleSearch} className="p-3 border-b border-slate-200 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Alıcı ya da firma adı"
                aria-label="Alıcı ya da firma adına göre ara"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-navy-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold transition-colors"
            >
              Ara
            </button>
          </form>

          {listLoading ? (
            <p className="p-4 text-sm text-slate-500">Yükleniyor…</p>
          ) : listError ? (
            <p className="p-4 text-sm text-red-700">{listError}</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              {submittedQuery ? 'Bu aramaya uyan konuşma yok.' : 'Henüz konuşma yok.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[65vh] overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
                      activeId === c.id ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-navy-900 truncate">
                        {c.buyerName} ↔ {c.companyName}
                      </span>
                      <span className="text-xs text-slate-500 shrink-0">{c.messageCount} mesaj</span>
                    </div>
                    <p className="text-sm text-slate-600 truncate mt-0.5">{c.preview || 'Mesaj yok'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(c.lastMessageAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!listLoading && !listError && total > pageSize && (
            <div className="p-3 border-t border-slate-200 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40"
              >
                Önceki
              </button>
              <span className="text-slate-600">
                {page} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          )}
        </section>

        {/* Seçili konuşma */}
        <section className="lg:col-span-3 bg-white rounded-lg border border-slate-200 min-h-[320px]">
          {!activeId ? (
            <p className="p-6 text-sm text-slate-500">Okumak için soldan bir konuşma seçin.</p>
          ) : threadLoading ? (
            <p className="p-6 text-sm text-slate-500">Yükleniyor…</p>
          ) : threadError ? (
            <p className="p-6 text-sm text-red-700">{threadError}</p>
          ) : detail ? (
            <>
              <header className="p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-navy-900">
                  {detail.buyerName} ↔ {detail.companyName}
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  {detail.listingTitle ? (
                    <>
                      İlan:{' '}
                      <a
                        href={`/ilan/${detail.listingId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-orange-600"
                      >
                        {detail.listingTitle}
                      </a>
                    </>
                  ) : (
                    'İlana bağlı değil'
                  )}
                  {' · '}Başlangıç: {formatDate(detail.createdAt)}
                </p>
              </header>

              {messages.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">Bu konuşmada mesaj yok.</p>
              ) : (
                <ol className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
                  {messages.map((m) => (
                    <li key={m.id} className={`flex ${m.side === 'company' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 border ${
                          m.side === 'company' ? 'bg-slate-50 border-slate-200' : 'bg-orange-50 border-orange-100'
                        }`}
                      >
                        <p className="text-xs text-slate-500 mb-0.5">
                          {m.side === 'company' ? detail.companyName : detail.buyerName} · {formatDate(m.createdAt)}
                          {m.isDeleted && ' · silinmiş'}
                        </p>
                        <p
                          className={`text-sm whitespace-pre-wrap break-words ${
                            m.isDeleted ? 'text-slate-400 line-through' : 'text-navy-900'
                          }`}
                        >
                          {m.content}
                        </p>
                        {m.hasAttachment && (
                          <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            Ek dosya var
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
