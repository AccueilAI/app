'use client';

import { useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { SendHorizontal, Square } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
}: ChatInputProps) {
  const t = useTranslations('Chat');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 5 * 24) + 'px';
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend();
    }
  }

  return (
    <div>
      <div className="flex items-end gap-2 rounded-2xl border border-[#D0D0D8] bg-white px-4 py-3 transition-all focus-within:border-[#2B4C8C] focus-within:ring-2 focus-within:ring-[#2B4C8C]/20">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          maxLength={2000}
          onChange={(e) => {
            onChange(e.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm leading-6 text-[#1A1A2E] outline-none placeholder:text-[#8A8A9A] disabled:opacity-50"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white transition-colors hover:bg-red-600"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!value.trim() || disabled}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2B4C8C] text-white transition-colors hover:bg-[#1E3A6E] disabled:opacity-40"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-[#8A8A9A]">
        {t('disclaimer')}
      </p>
    </div>
  );
}
