'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

const FAQ_COUNT = 5;

export function FAQ() {
  const t = useTranslations('FAQ');
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-[13px] font-bold uppercase tracking-[2px] text-[#002395]">
            FAQ
          </p>
          <h2 className="mt-4 font-serif text-[42px] leading-tight text-[#1A1A2E]">
            {t('headline')}
          </h2>
        </div>

        <div className="mt-12 overflow-hidden rounded-[14px] border border-[#E8E6E1] bg-[#FAFAF8]">
          {Array.from({ length: FAQ_COUNT }, (_, i) => (
            <div key={i}>
              {i > 0 && <div className="h-px bg-[#E8E6E1]" />}
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-base font-semibold text-[#1A1A2E]">
                  {t(`items.${i}.q`)}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-[#002395] transition-transform ${
                    open === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-200 ${
                  open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-[15px] leading-[1.6] text-[#5C5C6F]">
                    {t(`items.${i}.a`)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
