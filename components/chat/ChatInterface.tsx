'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import type { ChatMessage } from '@/lib/chat/types';

const STORAGE_KEY = 'accueil_chat_messages';
const FREE_LIMIT = 3;

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
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
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Load messages from localStorage on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const saved = loadMessages();
      if (saved.length > 0) setMessages(saved);
    }
  }, []);

  // Persist messages to localStorage on change
  useEffect(() => {
    if (initialized.current && messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

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
          body: JSON.stringify({ messages: history, language: locale }),
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
                } else if (eventType === 'done') {
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
    [input, isStreaming, dailyLimitReached, messages, locale, t],
  );

  function handleStop() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  const suggestedQuestions = [0, 1, 2, 3].map((i) =>
    t(`suggestedQuestions.${i}`),
  );

  const isEmpty = messages.length === 0;
  const showLimitBanner = dailyLimitReached && !user;

  return (
    <div className="flex h-dvh flex-col bg-[#FAFAF8] pt-16">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {isEmpty ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF2F9]">
                <Sparkles className="h-6 w-6 text-[#2B4C8C]" />
              </div>
              <h2 className="font-serif text-2xl text-[#1A1A2E]">
                {t('welcome')}
              </h2>
              <p className="mt-2 max-w-md text-sm text-[#5C5C6F]">
                {t('welcomeSub')}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="cursor-pointer rounded-full border border-[#D0D0D8] bg-white px-4 py-2 text-sm text-[#1A1A2E] transition-colors hover:border-[#2B4C8C] hover:bg-[#EEF2F9]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && i === messages.length - 1}
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
      <div className="border-t border-[#E5E3DE] bg-white/80 backdrop-blur-sm">
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
