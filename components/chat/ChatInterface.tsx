'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, X, ArrowRight, PanelLeft } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ConversationSidebar } from './ConversationSidebar';
import { OnboardingWelcome } from './OnboardingWelcome';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { createClient } from '@/lib/supabase/browser';
import type { ChatMessage } from '@/lib/chat/types';

const ANON_STORAGE_KEY = 'accueil_chat_anon';

function loadAnonMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(ANON_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveAnonMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(ANON_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // storage full or unavailable
  }
}

export function ChatInterface() {
  const t = useTranslations('Chat');
  const locale = useLocale();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Load messages when auth state changes
  useEffect(() => {
    setMessages([]);
    setDailyLimitReached(false);
    setRemaining(null);
    setError(null);

    if (user) {
      // Authenticated: start fresh, load conversations from sidebar
      setConversationId(null);
      initialized.current = true;
    } else {
      // Anonymous: load from localStorage
      setMessages(loadAnonMessages());
      initialized.current = true;
    }
  }, [user?.id]);

  // Persist to localStorage only for anonymous users
  useEffect(() => {
    if (initialized.current && !user && messages.length > 0) {
      saveAnonMessages(messages);
    }
  }, [messages, user]);


  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, []);

  // Scroll on new messages and during streaming content updates
  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, lastContent, scrollToBottom]);

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isStreaming || dailyLimitReached) return;

      setInput('');
      setError(null);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, language: locale, conversationId }),
          signal: abort.signal,
        });

        if (!res.ok) {
          if (res.status === 429) {
            const body = await res.json().catch(() => ({}));
            if (body.error === 'daily_limit') {
              setDailyLimitReached(true);
              setRemaining(0);
              // remove the empty assistant message
              setMessages((prev) =>
                prev.filter((m) => m.id !== assistantId),
              );
              return;
            }
            throw new Error('rate_limit');
          }
          throw new Error('request_failed');
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('no_stream');

        const decoder = new TextDecoder();
        let buffer = '';
        let eventType = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                if (eventType === 'sources') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, sources: parsed.sources }
                        : m,
                    ),
                  );
                } else if (eventType === 'token') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + parsed.text }
                        : m,
                    ),
                  );
                } else if (eventType === 'verification') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, verification: parsed }
                        : m,
                    ),
                  );
                } else if (eventType === 'progress') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, progress: parsed.stage }
                        : m,
                    ),
                  );
                } else if (eventType === 'web_sources') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, webSources: parsed.sources }
                        : m,
                    ),
                  );
                } else if (eventType === 'followups') {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, followUps: parsed.questions }
                        : m,
                    ),
                  );
                } else if (eventType === 'done') {
                  if (parsed.conversationId) {
                    setConversationId(parsed.conversationId);
                  }
                  if (parsed.remaining !== undefined) {
                    setRemaining(parsed.remaining);
                    if (parsed.remaining <= 0) {
                      setDailyLimitReached(true);
                    }
                  }
                } else if (eventType === 'error') {
                  setError(parsed.message ?? t('error'));
                }
              } catch {
                // skip malformed JSON
              }
              eventType = '';
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // user stopped — keep partial response
        } else {
          const msg = (err as Error).message;
          setError(msg === 'rate_limit' ? t('rateLimit') : t('error'));
          // remove empty assistant message on error
          setMessages((prev) =>
            prev.filter(
              (m) => !(m.id === assistantId && m.content === ''),
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [input, isStreaming, dailyLimitReached, messages, locale, conversationId, t],
  );

  function handleStop() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  function handleNewChat() {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setDailyLimitReached(false);
  }

  async function handleSelectConversation(id: string) {
    setConversationId(id);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('chat_logs')
        .select('user_message, assistant_message, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
      if (data) {
        const loaded: ChatMessage[] = data.flatMap((row) => [
          { id: crypto.randomUUID(), role: 'user' as const, content: row.user_message, timestamp: new Date(row.created_at).getTime() },
          { id: crypto.randomUUID(), role: 'assistant' as const, content: row.assistant_message, timestamp: new Date(row.created_at).getTime() },
        ]);
        setMessages(loaded);
      }
    } catch { /* ignore */ }
  }

  function handleRegenerate() {
    if (isStreaming || messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;
    // Remove the last assistant message and re-send
    setMessages((prev) => prev.slice(0, -1));
    handleSend(lastUserMsg.content);
  }

  const isEmpty = messages.length === 0;
  const showLimitBanner = dailyLimitReached && !user;

  const sidebarActive = !!user && sidebarOpen;

  return (
    <div className="flex h-dvh flex-col bg-[#FAFAF8] pt-16 pb-14 md:pb-0">
      {/* ConversationSidebar (auth users only) */}
      {user && (
        <ConversationSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          currentId={conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewChat}
        />
      )}

      {/* Mobile sidebar toggle */}
      {user && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-3 top-[4.5rem] z-10 cursor-pointer rounded-lg p-2 text-[#5C5C6F] transition-colors hover:bg-[#EEF2F9] hover:text-[#2B4C8C] md:hidden"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}

      {/* Messages — shift right when sidebar is open on desktop */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto transition-[margin] duration-200 ${sidebarActive ? 'md:ml-[260px]' : ''}`}
      >
        <div className="mx-auto max-w-3xl px-4 py-6">
          {isEmpty ? (
            <OnboardingWelcome onSend={handleSend} />
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && i === messages.length - 1}
                  isLast={i === messages.length - 1}
                  onRegenerate={handleRegenerate}
                  onSend={handleSend}
                  userQuery={
                    msg.role === 'assistant'
                      ? messages
                          .slice(0, i)
                          .findLast((m) => m.role === 'user')?.content
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          {/* Daily limit banner */}
          {showLimitBanner && (
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[#E5E3DE] bg-white p-6 text-center shadow-sm">
              <div className="mb-3 flex justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2F9]">
                  <Sparkles className="h-5 w-5 text-[#2B4C8C]" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#1A1A2E]">
                {t('dailyLimitTitle')}
              </h3>
              <p className="mt-2 text-sm text-[#5C5C6F]">
                {t('dailyLimitMessage')}
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                <a
                  href={`/${locale}#waitlist`}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2B4C8C] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E]"
                >
                  {t('dailyLimitCta')}
                  <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setLoginOpen(true)}
                  className="cursor-pointer text-sm font-medium text-[#2B4C8C] transition-colors hover:text-[#1E3A6E]"
                >
                  {t('dailyLimitSignIn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className={`border-t border-[#E5E3DE] bg-white/80 backdrop-blur-sm transition-[margin] duration-200 ${sidebarActive ? 'md:ml-[260px]' : ''}`}>
        <div className="mx-auto max-w-3xl px-4 py-4">
          {error && (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {/* Remaining counter */}
          {!user && remaining !== null && remaining > 0 && !showLimitBanner && (
            <p className="mb-2 text-center text-xs text-[#8E8E9A]">
              {t('remaining', { count: remaining })}
            </p>
          )}
          {showLimitBanner ? (
            <div className="flex items-center justify-center rounded-lg border border-[#E5E3DE] bg-[#FAFAF8] px-4 py-3 text-sm text-[#8E8E9A]">
              {t('dailyLimitInput')}
            </div>
          ) : (
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => handleSend()}
              onStop={handleStop}
              isStreaming={isStreaming}
            />
          )}
        </div>
      </div>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
