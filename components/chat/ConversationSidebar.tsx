'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, MessageSquare, Trash2, Search, PanelLeftClose, PanelLeft } from 'lucide-react';
import type { Conversation } from '@/lib/chat/types';

interface ConversationSidebarProps {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  open: boolean;
  onToggle: () => void;
  titleUpdate?: { id: string; title: string } | null;
}

function groupByDate(conversations: Conversation[], t: (key: string) => string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: t('sidebar.today'), items: [] },
    { label: t('sidebar.thisWeek'), items: [] },
    { label: t('sidebar.older'), items: [] },
  ];

  for (const c of conversations) {
    const d = new Date(c.updated_at);
    if (d >= todayStart) groups[0].items.push(c);
    else if (d >= weekStart) groups[1].items.push(c);
    else groups[2].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function ConversationSidebar({
  currentId,
  onSelect,
  onNew,
  open,
  onToggle,
  titleUpdate,
}: ConversationSidebarProps) {
  const t = useTranslations('Chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Fetch on mount and when a new conversation is created (currentId changes)
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, currentId]);

  // Update title in-place when server sends titleUpdate via SSE
  useEffect(() => {
    if (!titleUpdate) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === titleUpdate.id ? { ...c, title: titleUpdate.title } : c,
      ),
    );
  }, [titleUpdate]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(t('sidebar.deleteConfirm'))) return;
    await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentId === id) onNew();
  }

  const filtered = search
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;
  const groups = groupByDate(filtered, t);

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside
        className={`fixed bottom-0 left-0 top-16 z-30 hidden w-[260px] flex-col border-r border-[#1E293B] bg-[#0F172A] transition-transform duration-200 md:flex ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={onNew}
            className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-[#334155] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors hover:bg-[#1E293B]"
          >
            <Plus className="h-4 w-4" />
            {t('sidebar.newChat')}
          </button>
          <button
            onClick={onToggle}
            className="cursor-pointer rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-[#1E293B] hover:text-[#E2E8F0]"
            title="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('sidebar.searchPlaceholder')}
              className="w-full rounded-lg border border-[#334155] bg-[#1E293B] py-2 pl-8 pr-3 text-xs text-[#E2E8F0] placeholder:text-[#64748B] focus:border-[#475569] focus:outline-none"
            />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {groups.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-[#64748B]">
              {t('sidebar.noConversations')}
            </p>
          ) : (
            groups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  {group.label}
                </p>
                {group.items.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                      c.id === currentId
                        ? 'bg-[#1E293B] text-white'
                        : 'text-[#CBD5E1] hover:bg-[#1E293B]/60'
                    }`}
                    onClick={() => onSelect(c.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                    <span className="flex-1 truncate text-[13px]">{c.title}</span>
                    <button
                      onClick={(e) => handleDelete(c.id, e)}
                      className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[#64748B] hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Mobile: overlay sidebar */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onToggle}
        />
      )}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-[280px] flex-col bg-[#0F172A] transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile header */}
        <div className="flex items-center gap-2 p-3 pt-4">
          <button
            onClick={onNew}
            className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-[#334155] px-3 py-2 text-sm font-medium text-[#E2E8F0] transition-colors hover:bg-[#1E293B]"
          >
            <Plus className="h-4 w-4" />
            {t('sidebar.newChat')}
          </button>
          <button
            onClick={onToggle}
            className="cursor-pointer rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-[#1E293B] hover:text-[#E2E8F0]"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('sidebar.searchPlaceholder')}
              className="w-full rounded-lg border border-[#334155] bg-[#1E293B] py-2 pl-8 pr-3 text-xs text-[#E2E8F0] placeholder:text-[#64748B] focus:border-[#475569] focus:outline-none"
            />
          </div>
        </div>

        {/* Mobile conversations */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {groups.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-[#64748B]">
              {t('sidebar.noConversations')}
            </p>
          ) : (
            groups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  {group.label}
                </p>
                {group.items.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                      c.id === currentId
                        ? 'bg-[#1E293B] text-white'
                        : 'text-[#CBD5E1] hover:bg-[#1E293B]/60'
                    }`}
                    onClick={() => {
                      onSelect(c.id);
                      onToggle();
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                    <span className="flex-1 truncate text-[13px]">{c.title}</span>
                    <button
                      onClick={(e) => handleDelete(c.id, e)}
                      className="cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[#64748B] hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Toggle button when sidebar is closed */}
      {!open && (
        <button
          onClick={onToggle}
          className="fixed left-3 top-[4.5rem] z-30 hidden cursor-pointer rounded-lg p-2 text-[#5C5C6F] transition-colors hover:bg-[#EEF2F9] hover:text-[#2B4C8C] md:block"
          title="Open sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
