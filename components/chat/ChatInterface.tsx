'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, X } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import type { ChatMessage } from '@/lib/chat/types';

export function ChatInterface() {
  const t = useTranslations('Chat');
  const locale = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isStreaming) return;

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
          const status = res.status;
          throw new Error(status === 429 ? 'rate_limit' : 'request_failed');
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('no_stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          let eventType = '';
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
    [input, isStreaming, messages, t],
  );

  function handleStop() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  const suggestedQuestions = [0, 1, 2, 3].map((i) =>
    t(`suggestedQuestions.${i}`),
  );

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-[#FAFAF8]">
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
                    className="rounded-full border border-[#D0D0D8] bg-white px-4 py-2 text-sm text-[#1A1A2E] transition-colors hover:border-[#2B4C8C] hover:bg-[#EEF2F9]"
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
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => handleSend()}
            onStop={handleStop}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
