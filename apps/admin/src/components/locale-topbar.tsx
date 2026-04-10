import type { Locale } from "@blockchain-escrow/shared";

import { LanguageSwitcher } from "./language-switcher";

type LocaleTopbarProps = {
  currentLocale: Locale;
  localeLabels: Record<Locale, string>;
  switcherAriaLabel: string;
  switcherLabel: string;
  subtitle: string;
  title: string;
};

export function LocaleTopbar(props: LocaleTopbarProps) {
  return (
    <div className="utility-topbar">
      <div className="utility-topbar-copy">
        <strong>{props.title}</strong>
        <span>{props.subtitle}</span>
      </div>
      <LanguageSwitcher
        ariaLabel={props.switcherAriaLabel}
        currentLocale={props.currentLocale}
        label={props.switcherLabel}
        localeLabels={props.localeLabels}
      />
    </div>
  );
}
