'use client';

import dynamic from 'next/dynamic';
import { useMobile } from '@/hooks/use-mobile';

// Dynamically import the I18nLanguageSwitcher with no SSR
const I18nLanguageSwitcher = dynamic(
  () =>
    import('./i18n-language-switcher').then(mod => mod.I18nLanguageSwitcher),
  { ssr: false }
);

export function GlobalLanguageSwitcher() {
  const { isMobile } = useMobile();

  return (
    <div className={`fixed z-40 ${isMobile ? 'top-2 left-2' : 'top-4 left-6'}`}>
      <I18nLanguageSwitcher />
    </div>
  );
}
