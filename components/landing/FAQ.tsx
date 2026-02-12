'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

const FAQ_COUNT = 5;

export function FAQ() {
  const t = useTranslations('FAQ');
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          {t('headline')}
        </h2>

        <div className="mt-12 divide-y divide-neutral-200">
          {Array.from({ length: FAQ_COUNT }, (_, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between py-5 text-left"
              >
                <span className="text-base font-medium text-neutral-900">
                  {t(`items.${i}.q`)}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-neutral-500 transition-transform ${
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
                  <p className="pb-5 text-sm leading-relaxed text-neutral-600">
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
