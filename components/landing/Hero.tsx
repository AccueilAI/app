'use client';

import { useTranslations } from 'next-intl';
import {
  ShieldCheck,
  FileText,
  Globe,
  Landmark,
  HeartPulse,
  House,
} from 'lucide-react';

const floatingCards = [
  { icon: FileText, label: 'Visa Documents', color: '#2B4C8C', rotate: '-3deg', className: 'left-[5%] top-[40%] lg:left-[8%]' },
  { icon: Globe, label: 'Multi-Language', color: '#D4A574', rotate: '-5deg', className: 'left-[6%] top-[14%] lg:left-[10%]' },
  { icon: ShieldCheck, label: 'CAF Verified', color: '#2D8A6E', rotate: '2deg', className: 'right-[5%] top-[28%] lg:right-[8%]' },
  { icon: Landmark, label: 'Tax & URSSAF', color: '#2B4C8C', rotate: '4deg', className: 'right-[6%] bottom-[38%] lg:right-[12%]' },
  { icon: HeartPulse, label: 'Health Insurance', color: '#C53030', rotate: '3deg', className: 'left-[8%] bottom-[12%] lg:left-[13%]' },
  { icon: House, label: 'Housing (APL)', color: '#C9A84C', rotate: '-2deg', className: 'right-[7%] bottom-[10%] lg:right-[9%]' },
] as const;

export function Hero() {
  const t = useTranslations('Hero');

  return (
    <section className="relative overflow-hidden pt-16">
      {/* Top tricolor accent */}
      <div className="flex h-1">
        <div className="flex-1 bg-[#002395]" />
        <div className="flex-1 bg-[#FAFAF8]" />
        <div className="flex-1 bg-[#ED2939]" />
      </div>

      {/* Background */}
      <div className="relative flex min-h-[400px] items-center justify-center px-4 py-10 sm:min-h-[540px] sm:px-6 sm:py-16"
        style={{
          background: 'radial-gradient(ellipse 120% 120% at 50% 40%, #EEF2F9 0%, #FAFAF8 100%)',
        }}
      >
        {/* Color glow effects */}
        <div
          className="pointer-events-none absolute -left-[100px] -top-[80px] h-[600px] w-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #002395, transparent)' }}
        />
        <div
          className="pointer-events-none absolute -right-[50px] top-[100px] h-[500px] w-[500px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #ED2939, transparent)' }}
        />
        <div
          className="pointer-events-none absolute bottom-[50px] left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #2B4C8C, transparent)' }}
        />

        {/* Floating cards — hidden on mobile */}
        {floatingCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`pointer-events-none absolute hidden items-center gap-2.5 rounded-xl border border-[#E5E3DE] bg-white px-3.5 py-2.5 shadow-md lg:flex ${card.className}`}
              style={{ transform: `rotate(${card.rotate})` }}
            >
              <Icon className="h-5 w-5 shrink-0" style={{ color: card.color }} />
              <span className="text-[13px] font-medium text-[#5C5C6F]">{card.label}</span>
            </div>
          );
        })}

        {/* Center content */}
        <div className="relative z-10 mx-auto max-w-[820px] text-center">
          {/* Trust badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#EEF2F9] px-4 py-1.5 sm:mb-8 sm:px-5 sm:py-2">
            <ShieldCheck className="h-4 w-4 text-[#2B4C8C]" />
            <span className="text-[13px] font-semibold text-[#2B4C8C]">
              {t('trust')}
            </span>
          </div>

          {/* Headline */}
          <h1 className="mx-auto whitespace-pre-line font-serif text-[28px] leading-[1.2] text-[#1A1A2E] sm:text-5xl sm:leading-[1.15] lg:text-[56px]">
            {t('headline')}
          </h1>

          {/* Subhead */}
          <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-[1.6] text-[#5C5C6F] sm:mt-8 sm:text-[19px] sm:leading-[1.65]">
            {t('subhead')}
          </p>

          {/* CTAs */}
          <div className="mt-6 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href="#waitlist"
              className="rounded-lg bg-[#2B4C8C] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#1E3A6E] sm:px-8 sm:py-3.5 sm:text-[17px]"
            >
              {t('cta')}
            </a>
            <a
              href="#features"
              className="rounded-lg border-[1.5px] border-[#2B4C8C] px-6 py-3 text-[15px] font-semibold text-[#2B4C8C] transition-colors hover:bg-[#2B4C8C]/5 sm:px-8 sm:py-3.5 sm:text-[17px]"
            >
              {t('ctaSub')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
