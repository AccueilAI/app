import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Shield } from 'lucide-react';

export function Hero() {
  const t = useTranslations('Hero');

  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-16">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        {/* Trust badge */}
        <Badge
          variant="secondary"
          className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
        >
          <Shield className="h-3 w-3" />
          {t('trust')}
        </Badge>

        {/* Headline */}
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
          {t('headline')}
        </h1>

        {/* Subhead */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl">
          {t('subhead')}
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="h-12 gap-2 rounded-full px-8 text-base font-medium"
            asChild
          >
            <a href="#waitlist">
              {t('cta')}
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <p className="text-sm text-neutral-500">{t('ctaSub')}</p>
        </div>

        {/* French accent decoration */}
        <div className="mt-16 flex justify-center gap-2">
          <div className="h-1 w-12 rounded-full bg-blue-600" />
          <div className="h-1 w-12 rounded-full bg-white border border-neutral-200" />
          <div className="h-1 w-12 rounded-full bg-red-500" />
        </div>
      </div>
    </section>
  );
}
