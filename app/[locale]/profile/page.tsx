'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Navbar } from '@/components/landing/Navbar';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { createClient } from '@/lib/supabase/browser';
import { MyExperiences } from '@/components/dashboard/MyExperiences';
import { MyDocuments } from '@/components/dashboard/MyDocuments';
import {
  SearchableCombobox,
  type ComboboxOption,
} from '@/components/ui/searchable-combobox';
import { COUNTRIES } from '@/lib/data/countries';
import { VISA_TYPE_OPTIONS } from '@/lib/benefits/visa-mapping';

type TabId = 'profile' | 'experiences' | 'documents';

const TAB_HASH_MAP: Record<string, TabId> = {
  '#experiences': 'experiences',
  '#documents': 'documents',
};

function getInitialTab(): TabId {
  if (typeof window === 'undefined') return 'profile';
  const hash = window.location.hash;
  return TAB_HASH_MAP[hash] ?? 'profile';
}

export default function ProfilePage() {
  const t = useTranslations('Auth');
  const td = useTranslations('Dashboard');
  const locale = useLocale();
  const { user, profile, isLoading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

  const [form, setForm] = useState({
    display_name: '',
    nationality: '',
    visa_type: '',
    arrival_date: '',
    birth_date: '',
    has_children: false,
    employment_status: 'unknown',
    prefecture: '',
    language: locale,
  });
  const [prefectureOptions, setPrefectureOptions] = useState<ComboboxOption[]>(
    [],
  );

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? '',
        nationality: profile.nationality ?? '',
        visa_type: profile.visa_type ?? '',
        arrival_date: profile.arrival_date ?? '',
        birth_date: profile.birth_date ?? '',
        has_children: profile.has_children ?? false,
        employment_status: profile.employment_status ?? 'unknown',
        prefecture: profile.prefecture ?? '',
        language: profile.language ?? locale,
      });
    }
  }, [profile, locale]);

  // Load prefecture options
  useEffect(() => {
    fetch('/api/prefectures')
      .then((r) => r.json())
      .then((data: ComboboxOption[]) => setPrefectureOptions(data))
      .catch(() => {});
  }, []);

  // Sync hash with active tab
  useEffect(() => {
    const hash = activeTab === 'profile' ? '' : `#${activeTab}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash || window.location.pathname);
    }
  }, [activeTab]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({
        display_name: form.display_name || null,
        nationality: form.nationality || null,
        visa_type: form.visa_type || null,
        arrival_date: form.arrival_date || null,
        birth_date: form.birth_date || null,
        has_children: form.has_children,
        employment_status: form.employment_status,
        prefecture: form.prefecture || null,
        language: form.language,
      })
      .eq('id', user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center pt-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B4C8C] border-t-transparent" />
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 pt-16">
          <p className="text-[#5C5C6F]">{t('loginRequired')}</p>
          <button
            onClick={() => setLoginOpen(true)}
            className="rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E]"
          >
            {t('signIn')}
          </button>
          <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
        </main>
      </>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'profile', label: td('tabs.profile') },
    { id: 'experiences', label: td('tabs.experiences') },
    { id: 'documents', label: td('tabs.documents') },
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-xl px-4 pt-24 pb-16">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">
          {t('profileTitle')}
        </h1>
        <p className="mt-1 text-sm text-[#5C5C6F]">{t('profileSub')}</p>

        {/* Tabs */}
        <div className="mt-6 flex border-b border-[#E5E3DE]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#2B4C8C] text-[#2B4C8C]'
                  : 'text-[#5C5C6F] hover:text-[#1A1A2E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content — all kept mounted to preserve state during tab switches */}
        <div className="mt-6">
          <div className={activeTab === 'profile' ? '' : 'hidden'}>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label
                  htmlFor="display_name"
                  className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
                >
                  {t('displayName')}
                </label>
                <input
                  id="display_name"
                  type="text"
                  value={form.display_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      display_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">
                  {t('nationality')}
                </label>
                <SearchableCombobox
                  options={COUNTRIES}
                  value={form.nationality}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, nationality: val }))
                  }
                  placeholder={t('nationality')}
                  searchPlaceholder={t('searchNationality')}
                />
              </div>

              <div>
                <label
                  htmlFor="visa_type"
                  className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
                >
                  {t('visaType')}
                </label>
                <select
                  id="visa_type"
                  value={form.visa_type}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      visa_type: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                >
                  <option value="">—</option>
                  {VISA_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="arrival_date"
                  className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
                >
                  {t('arrivalDate')}
                </label>
                <input
                  id="arrival_date"
                  type="date"
                  value={form.arrival_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      arrival_date: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                />
              </div>

              {/* Birth date */}
              <div>
                <label
                  htmlFor="birth_date"
                  className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
                >
                  {t('birthDate')}
                </label>
                <input
                  id="birth_date"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, birth_date: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                />
              </div>

              {/* Has children */}
              <div className="flex items-center justify-between rounded-lg border border-[#E5E3DE] px-3.5 py-2.5">
                <label htmlFor="has_children" className="text-sm font-medium text-[#1A1A2E]">
                  {t('hasChildren')}
                </label>
                <button
                  id="has_children"
                  type="button"
                  role="switch"
                  aria-checked={form.has_children}
                  onClick={() => setForm((prev) => ({ ...prev, has_children: !prev.has_children }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                    form.has_children ? 'bg-[#2B4C8C]' : 'bg-[#E5E3DE]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      form.has_children ? 'translate-x-5' : 'translate-x-0.5'
                    } mt-0.5`}
                  />
                </button>
              </div>

              {/* Employment status */}
              <div>
                <label
                  htmlFor="employment_status"
                  className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
                >
                  {t('employmentStatus')}
                </label>
                <select
                  id="employment_status"
                  value={form.employment_status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, employment_status: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                >
                  <option value="unknown">{t('employmentOptions.unknown')}</option>
                  <option value="employed">{t('employmentOptions.employed')}</option>
                  <option value="self_employed">{t('employmentOptions.selfEmployed')}</option>
                  <option value="student">{t('employmentOptions.student')}</option>
                  <option value="unemployed">{t('employmentOptions.unemployed')}</option>
                  <option value="retired">{t('employmentOptions.retired')}</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">
                  {t('prefecture')}
                </label>
                <SearchableCombobox
                  options={prefectureOptions}
                  value={form.prefecture}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, prefecture: val }))
                  }
                  placeholder={t('prefecture')}
                  searchPlaceholder={t('searchPrefecture')}
                />
              </div>

              <div>
                <label
                  htmlFor="language"
                  className="mb-1.5 block text-sm font-medium text-[#1A1A2E]"
                >
                  {t('preferredLanguage')}
                </label>
                <select
                  id="language"
                  value={form.language}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      language: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
                >
                  <option value="en">English</option>
                  <option value="fr">Fran&ccedil;ais</option>
                  <option value="ko">한국어</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#2B4C8C] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E3A6E] disabled:opacity-50"
                >
                  {saving ? t('saving') : t('save')}
                </button>
                {saved && (
                  <span className="text-sm font-medium text-emerald-600">
                    {t('saved')}
                  </span>
                )}
              </div>
            </form>
          </div>

          <div className={activeTab === 'experiences' ? '' : 'hidden'}>
            <MyExperiences />
          </div>
          <div className={activeTab === 'documents' ? '' : 'hidden'}>
            <MyDocuments />
          </div>
        </div>
      </main>
    </>
  );
}
