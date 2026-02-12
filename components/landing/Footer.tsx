import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('Footer');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#001A6E] text-[#8A9AC0]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {/* Top row */}
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="max-w-[280px]">
            <a href="#" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2B4C8C]">
                <span className="font-serif text-lg text-white">A</span>
              </div>
              <span className="font-serif text-[22px] text-white">
                AccueilAI
              </span>
            </a>
            <p className="mt-4 text-sm leading-[1.6]">
              {t('tagline')}
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16 text-sm">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[1px] text-[#C0C8E0]">
                {t('product')}
              </p>
              <ul className="mt-4 space-y-3">
                <li><a href="#features" className="hover:text-white">{t('features', { defaultValue: 'Features' })}</a></li>
                <li><a href="#pricing" className="hover:text-white">{t('pricing', { defaultValue: 'Pricing' })}</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
                <li><a href="#waitlist" className="hover:text-white">Waitlist</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[1px] text-[#C0C8E0]">
                {t('legal')}
              </p>
              <ul className="mt-4 space-y-3">
                <li><a href="#" className="hover:text-white">{t('privacy_policy')}</a></li>
                <li><a href="#" className="hover:text-white">{t('terms')}</a></li>
                <li><a href="#" className="hover:text-white">{t('disclaimer')}</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tricolor divider */}
        <div className="mt-12 flex h-0.5">
          <div className="flex-1 bg-[#002395]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#ED2939]" />
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-2 text-[13px] text-[#6A7AA0] sm:flex-row">
          <p>&copy; {year} AccueilAI. {t('rights')}</p>
          <p className="italic">Made with care for those far from home.</p>
        </div>
      </div>
    </footer>
  );
}
