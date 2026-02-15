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

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === 'profile' && (
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
                  <option value="VLS-TS">VLS-TS</option>
                  <option value="Talent Passport">Talent Passport</option>
                  <option value="Student">Student</option>
                  <option value="APS">APS</option>
                  <option value="Salarié">Salarié</option>
                  <option value="Vie Privée et Familiale">
                    Vie Privée et Familiale
                  </option>
                  <option value="Visiteur">Visiteur</option>
                  <option value="Other">Other</option>
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
          )}

          {activeTab === 'experiences' && <MyExperiences />}
          {activeTab === 'documents' && <MyDocuments />}
        </div>
      </main>
    </>
  );
}
