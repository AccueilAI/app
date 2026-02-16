'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { Benefit, BenefitCategory } from '@/lib/benefits/types';
import { CATEGORY_COLORS } from '@/lib/benefits/types';

function getLocalized(benefit: Benefit, field: string, locale: string): string {
  const key = `${field}_${locale}` as keyof Benefit;
  return (benefit[key] as string) || (benefit[`${field}_en` as keyof Benefit] as string) || '';
}

interface BenefitDetailProps {
  benefit: Benefit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
}

export function BenefitDetail({ benefit, open, onOpenChange, locale }: BenefitDetailProps) {
  const t = useTranslations('Benefits');

  if (!benefit) return null;

  const colorClass = CATEGORY_COLORS[benefit.category as BenefitCategory] ?? '';
  const steps = benefit.how_to_apply?.[`steps_${locale}` as keyof typeof benefit.how_to_apply] as string[] | undefined
    ?? benefit.how_to_apply?.steps_en
    ?? [];
  const docs = benefit.how_to_apply?.documents ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="mb-2">
            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}>
              {t(`categories.${benefit.category}`)}
            </span>
          </div>
          <SheetTitle className="text-lg text-[#1A1A2E]">
            {getLocalized(benefit, 'name', locale)}
          </SheetTitle>
          <SheetDescription className="text-[#5C5C6F]">
            {getLocalized(benefit, 'description', locale)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          {/* Amount */}
          {benefit.estimated_amount && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-[#1A1A2E]">{t('amount')}</h4>
              <p className="text-sm text-[#2B4C8C] font-medium">{benefit.estimated_amount}</p>
            </div>
          )}

          {/* Processing time */}
          {benefit.processing_time && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-[#1A1A2E]">{t('processingTime')}</h4>
              <p className="text-sm text-[#5C5C6F]">{benefit.processing_time}</p>
            </div>
          )}

          {/* How to apply */}
          {steps.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-[#1A1A2E]">{t('howToApply')}</h4>
              <ol className="space-y-2">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-[#5C5C6F]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF2F9] text-xs font-semibold text-[#2B4C8C]">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Required documents */}
          {docs.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold text-[#1A1A2E]">{t('requiredDocs')}</h4>
              <ul className="space-y-1.5">
                {docs.map((doc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#5C5C6F]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2B4C8C]" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Official link */}
          {benefit.official_url && (
            <a
              href={benefit.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6DDE8] px-4 py-2.5 text-sm font-medium text-[#2B4C8C] transition-colors hover:bg-[#EEF2F9]"
            >
              <ExternalLink className="h-4 w-4" />
              {t('officialLink')}
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
