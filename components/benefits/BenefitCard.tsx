'use client';

import { useTranslations } from 'next-intl';
import {
  Home,
  Heart,
  Banknote,
  Briefcase,
  Scale,
  GraduationCap,
  Check,
} from 'lucide-react';
import type { Benefit, BenefitCategory } from '@/lib/benefits/types';
import { CATEGORY_COLORS } from '@/lib/benefits/types';

const ICONS: Record<string, typeof Home> = {
  Home,
  Heart,
  Banknote,
  Briefcase,
  Scale,
  GraduationCap,
};

function getLocalized(benefit: Benefit, field: string, locale: string): string {
  const key = `${field}_${locale}` as keyof Benefit;
  return (benefit[key] as string) || (benefit[`${field}_en` as keyof Benefit] as string) || '';
}

interface BenefitCardProps {
  benefit: Benefit;
  isMatched: boolean;
  isPartial?: boolean;
  locale: string;
  onClick: () => void;
}

export function BenefitCard({ benefit, isMatched, isPartial, locale, onClick }: BenefitCardProps) {
  const t = useTranslations('Benefits');
  const Icon = ICONS[
    { housing: 'Home', healthcare: 'Heart', financial: 'Banknote', employment: 'Briefcase', legal: 'Scale', education: 'GraduationCap' }[benefit.category] ?? 'Home'
  ];
  const colorClass = CATEGORY_COLORS[benefit.category as BenefitCategory] ?? '';

  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-xl border border-[#D6DDE8] bg-white p-5 text-left transition-shadow hover:shadow-md"
    >
      {/* Top: category badge + matched */}
      <div className="mb-3 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}>
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {t(`categories.${benefit.category}`)}
        </span>
        {isMatched && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <Check className="h-3 w-3" />
            {t('eligible')}
          </span>
        )}
        {!isMatched && isPartial && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {t('possiblyEligible')}
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="mb-1.5 text-[15px] font-semibold text-[#1A1A2E] group-hover:text-[#2B4C8C]">
        {getLocalized(benefit, 'name', locale)}
      </h3>

      {/* Description (2-line clamp) */}
      <p className="mb-3 line-clamp-2 text-sm text-[#5C5C6F]">
        {getLocalized(benefit, 'description', locale)}
      </p>

      {/* Amount */}
      {benefit.estimated_amount && (
        <div className="mt-auto pt-2 text-sm font-medium text-[#2B4C8C]">
          {benefit.estimated_amount}
        </div>
      )}
    </button>
  );
}
