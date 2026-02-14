'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, ThumbsUp, ThumbsDown } from 'lucide-react';
import { SourceCitations } from './SourceCitations';
import { VerificationBadge } from './VerificationBadge';
import type { ChatMessage } from '@/lib/chat/types';

interface MessageBubbleProps {
  message: ChatMessage;
  /** The user query that triggered this assistant response (for feedback logging) */
  userQuery?: string;
  isStreaming?: boolean;
}

export function MessageBubble({ message, userQuery, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleFeedback = useCallback(
    async (rating: 'up' | 'down') => {
      if (feedback) return; // already rated
      setFeedback(rating);

      try {
        await fetch('/api/chat/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: message.id,
            rating,
            userQuery,
            assistantResponse: message.content,
            sourceCount: message.sources?.length ?? 0,
          }),
        });
      } catch {
        // silently fail — feedback is non-critical
      }
    },
    [feedback, message.id, message.content, message.sources, userQuery],
  );

  return (
    <div
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2B4C8C]">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'rounded-br-md bg-[#2B4C8C] text-white'
              : 'rounded-bl-md bg-[#EEF2F9] text-[#1A1A2E]'
          }`}
        >
          {!isUser && isStreaming && !message.content ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#8A8A9A] [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#8A8A9A] [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-[#8A8A9A] [animation-delay:300ms]" />
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-[#1A1A2E] prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-a:text-[#2B4C8C] prose-a:underline prose-hr:my-3 prose-strong:text-[#1A1A2E]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceCitations sources={message.sources} />
        )}
        {!isUser && message.content && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => handleFeedback('up')}
                disabled={!!feedback}
                className={`rounded-md p-1.5 transition-colors ${
                  feedback === 'up'
                    ? 'bg-green-100 text-green-600'
                    : feedback
                      ? 'cursor-default text-[#D0D0D8]'
                      : 'text-[#8A8A9A] hover:bg-[#EEF2F9] hover:text-[#2B4C8C]'
                }`}
                aria-label="Helpful"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleFeedback('down')}
                disabled={!!feedback}
                className={`rounded-md p-1.5 transition-colors ${
                  feedback === 'down'
                    ? 'bg-red-100 text-red-600'
                    : feedback
                      ? 'cursor-default text-[#D0D0D8]'
                      : 'text-[#8A8A9A] hover:bg-[#EEF2F9] hover:text-[#2B4C8C]'
                }`}
                aria-label="Not helpful"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </div>
            {message.verification && (
              <VerificationBadge verification={message.verification} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
