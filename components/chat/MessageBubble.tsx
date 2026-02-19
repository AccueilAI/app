'use client';

import { useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SourceCitations } from './SourceCitations';
import { VerificationBadge } from './VerificationBadge';
import { StreamProgress } from './StreamProgress';
import { MessageActions } from './MessageActions';
import { FollowUpChips } from './FollowUpChips';
import { WebSourceCards } from './WebSourceCards';
import type { ChatMessage, ChatSource } from '@/lib/chat/types';

/**
 * Replace [Source N] references in markdown with clickable links.
 * If the source has a URL, creates a markdown link that opens in a new tab.
 * If not, creates a link to the source's origin (constructed from source name).
 */
function getSourceUrl(src: ChatSource): string | null {
  if (src.source_url) return src.source_url;
  // Construct fallback URLs from source name
  if (src.source?.startsWith('service-public')) {
    return 'https://www.service-public.fr';
  }
  if (src.source?.startsWith('welcome-to-france')) {
    return 'https://www.welcome-to-france.com';
  }
  if (src.doc_type === 'law_article' && src.article_number) {
    return `https://www.legifrance.gouv.fr/search/all?tab_selection=all&searchField=ALL&query=${encodeURIComponent(src.article_number)}`;
  }
  return null;
}

function linkifySources(text: string, sources?: ChatSource[]): string {
  if (!sources || sources.length === 0) return text;
  return text.replace(
    /\[Source\s*(\d+)(?:\s*[-–]\s*(\d+))?\]/gi,
    (match, startStr, endStr) => {
      const start = parseInt(startStr, 10);
      if (endStr) {
        const end = parseInt(endStr, 10);
        const links: string[] = [];
        for (let i = start; i <= end; i++) {
          const src = sources[i - 1];
          const url = src ? getSourceUrl(src) : null;
          links.push(url ? `[Source ${i}](${url})` : `Source ${i}`);
        }
        return links.join(', ');
      }
      const src = sources[start - 1];
      const url = src ? getSourceUrl(src) : null;
      if (url) return `[Source ${start}](${url})`;
      return match;
    },
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  /** The user query that triggered this assistant response (for feedback logging) */
  userQuery?: string;
  isStreaming?: boolean;
  isLast?: boolean;
  onRegenerate?: () => void;
  onSend?: (text: string) => void;
}

export function MessageBubble({ message, userQuery, isStreaming, isLast, onRegenerate, onSend }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'accuracy' | 'outdated' | 'other'>('accuracy');
  const [feedbackComment, setFeedbackComment] = useState('');
  const t = useTranslations('Chat');

  const handleFeedback = useCallback(
    async (rating: 'up' | 'down') => {
      if (feedback) return;
      if (rating === 'up') {
        setFeedback('up');
        try {
          await fetch('/api/chat/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageId: message.id,
              rating: 'up',
              userQuery,
              assistantResponse: message.content,
              sourceCount: message.sources?.length ?? 0,
            }),
          });
        } catch { /* non-critical */ }
      } else {
        setShowFeedbackModal(true);
      }
    },
    [feedback, message.id, message.content, message.sources, userQuery],
  );

  const submitNegativeFeedback = useCallback(async () => {
    setFeedback('down');
    setShowFeedbackModal(false);
    try {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.id,
          rating: 'down',
          userQuery,
          assistantResponse: message.content,
          sourceCount: message.sources?.length ?? 0,
          feedbackType,
          comment: feedbackComment || undefined,
          sourceUrls: message.sources?.map(s => s.source_url).filter(Boolean),
        }),
      });
    } catch { /* non-critical */ }
  }, [message.id, message.content, message.sources, userQuery, feedbackType, feedbackComment]);

  return (
    <div
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2B4C8C]">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'rounded-br-md bg-[#2B4C8C] text-white'
              : 'rounded-bl-md bg-[#EEF2F9] text-[#1A1A2E]'
          }`}
        >
          {!isUser && isStreaming && !message.content ? (
            message.progress ? (
              <StreamProgress stage={message.progress} />
            ) : (
              <div className="flex items-center gap-1.5 py-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8A8A9A] [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8A8A9A] [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#8A8A9A] [animation-delay:300ms]" />
              </div>
            )
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              {message.webSources && message.webSources.length > 0 && (
                <WebSourceCards sources={message.webSources} />
              )}
              <div className="prose prose-sm max-w-none prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-[#1A1A2E] prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-a:text-[#2B4C8C] prose-a:underline prose-hr:my-3 prose-strong:text-[#1A1A2E]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children, ...props }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer text-[#2B4C8C] underline hover:text-[#1E3A6E]"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {linkifySources(message.content, message.sources)}
              </ReactMarkdown>
              </div>
            </>
          )}
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceCitations sources={message.sources} />
        )}
        {!isUser && message.content && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex gap-1">
              {onRegenerate && (
                <MessageActions content={message.content} onRegenerate={onRegenerate} />
              )}
              <button
                onClick={() => handleFeedback('up')}
                disabled={!!feedback}
                className={`rounded-md p-1.5 transition-colors ${
                  feedback === 'up'
                    ? 'bg-green-100 text-green-600'
                    : feedback
                      ? 'cursor-default text-[#D0D0D8]'
                      : 'cursor-pointer text-[#8A8A9A] hover:bg-[#EEF2F9] hover:text-[#2B4C8C]'
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
                      : 'cursor-pointer text-[#8A8A9A] hover:bg-[#EEF2F9] hover:text-[#2B4C8C]'
                }`}
                aria-label="Not helpful"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </div>
            {showFeedbackModal && (
              <div className="mt-2 rounded-lg border border-[#E5E3DE] bg-white p-3 shadow-sm">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#1A1A2E]">{t('feedbackTitle')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['accuracy', 'outdated', 'other'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setFeedbackType(type)}
                        className={`rounded-full px-3 py-1 text-xs transition-colors ${
                          feedbackType === type
                            ? 'bg-[#2B4C8C] text-white'
                            : 'bg-[#F5F3EE] text-[#5C5C6F] hover:bg-[#E5E3DE]'
                        }`}
                      >
                        {t(`feedbackType_${type}`)}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={feedbackComment}
                    onChange={e => setFeedbackComment(e.target.value)}
                    placeholder={t('feedbackCommentPlaceholder')}
                    className="w-full rounded-md border border-[#E5E3DE] bg-[#F5F3EE] p-2 text-xs text-[#1A1A2E] placeholder:text-[#8A8A9A] focus:border-[#2B4C8C] focus:outline-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={submitNegativeFeedback}
                      className="rounded-md bg-[#2B4C8C] px-3 py-1.5 text-xs text-white transition-colors hover:bg-[#1E3A6E]"
                    >
                      {t('feedbackSubmit')}
                    </button>
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      className="rounded-md px-3 py-1.5 text-xs text-[#5C5C6F] transition-colors hover:bg-[#F5F3EE]"
                    >
                      {t('feedbackCancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {message.verification && (
              <VerificationBadge verification={message.verification} />
            )}
          </div>
        )}
        {!isUser && isLast && !isStreaming && message.followUps && message.followUps.length > 0 && onSend && (
          <FollowUpChips questions={message.followUps} onSend={onSend} />
        )}
      </div>
    </div>
  );
}
