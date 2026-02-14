'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Navbar } from '@/components/landing/Navbar';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { createClient } from '@/lib/supabase/browser';

export default function ProfilePage() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const { user, profile, isLoading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    display_name: '',
    language: locale,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? '',
        language: profile.language ?? locale,
      });
    }
  }, [profile, locale]);

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

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-xl px-4 pt-24 pb-16">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">
          {t('profileTitle')}
        </h1>
        <p className="mt-1 text-sm text-[#5C5C6F]">{t('profileSub')}</p>

        <form onSubmit={handleSave} className="mt-8 space-y-5">
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
                setForm((prev) => ({ ...prev, display_name: e.target.value }))
              }
              className="w-full rounded-lg border border-[#E5E3DE] px-3.5 py-2.5 text-sm text-[#1A1A2E] outline-none transition-colors focus:border-[#2B4C8C] focus:ring-1 focus:ring-[#2B4C8C]"
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
                setForm((prev) => ({ ...prev, language: e.target.value }))
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
      </main>
    </>
  );
}
