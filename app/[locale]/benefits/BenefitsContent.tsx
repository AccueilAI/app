'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Gift, Newspaper } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import type { Benefit, BenefitCategory } from '@/lib/benefits/types';
import { BENEFIT_CATEGORIES, CATEGORY_COLORS } from '@/lib/benefits/types';
import { BenefitCard } from '@/components/benefits/BenefitCard';
import { BenefitDetail } from '@/components/benefits/BenefitDetail';
import { NewsFeed } from '@/components/benefits/NewsFeed';

type Tab = 'benefits' | 'news';

const TABS: { key: Tab; icon: typeof Gift }[] = [
  { key: 'benefits', icon: Gift },
  { key: 'news', icon: Newspaper },
];

export function BenefitsContent({ locale }: { locale: string }) {
  const t = useTranslations('Benefits');
  const { user, isLoading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const [tab, setTab] = useState<Tab>('benefits');
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [partialIds, setPartialIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const url = '/api/benefits?matched=true';
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setBenefits(data.benefits ?? []);
        setMatchedIds(data.matchedIds ?? []);
        setPartialIds(data.partialIds ?? []);
      })
      .catch(() => {
        setBenefits([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const filtered =
    selectedCategory === 'all'
      ? benefits
      : benefits.filter((b) => b.category === selectedCategory);

  function openDetail(benefit: Benefit) {
    setSelectedBenefit(benefit);
    setDetailOpen(true);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#EEF2F9] pt-24 pb-16">
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B4C8C] border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#EEF2F9] pt-24 pb-16">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white">
            <Gift className="h-8 w-8 text-[#2B4C8C]" />
          </div>
          <p className="mb-4 text-sm text-[#5C5C6F]">
            {t('loginForMatching')}
          </p>
          <button
            onClick={() => setLoginOpen(true)}
            className="rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E]"
          >
            {t('loginForMatching')}
          </button>
          <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF2F9] pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            {t('pageTitle')}
          </h1>
          <p className="mt-1 text-[#5C5C6F]">{t('pageSubtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-[#D6DDE8] bg-white p-1">
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-[#2B4C8C] text-white'
                  : 'text-[#5C5C6F] hover:bg-[#EEF2F9]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t(`tabs.${key}`)}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'benefits' && (
          <div>
            {/* Category filters */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#2B4C8C] text-white'
                    : 'bg-white text-[#5C5C6F] hover:bg-[#D6DDE8]'
                }`}
              >
                {t('allCategories')}
              </button>
              {BENEFIT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? CATEGORY_COLORS[cat as BenefitCategory]
                      : 'bg-white text-[#5C5C6F] hover:bg-[#D6DDE8]'
                  }`}
                >
                  {t(`categories.${cat}`)}
                </button>
              ))}
            </div>

            {/* Benefits grid */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-xl bg-white"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-[#5C5C6F]">
                {t('noResults')}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((b) => (
                  <BenefitCard
                    key={b.id}
                    benefit={b}
                    isMatched={matchedIds.includes(b.id)}
                    isPartial={partialIds.includes(b.id)}
                    locale={locale}
                    onClick={() => openDetail(b)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className={tab === 'news' ? '' : 'hidden'}>
          <NewsFeed locale={locale} />
        </div>
      </div>

      {/* Detail sheet */}
      <BenefitDetail
        benefit={selectedBenefit}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        locale={locale}
      />
    </main>
  );
}
