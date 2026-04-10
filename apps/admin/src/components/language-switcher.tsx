"use client";

import type { Locale } from "@blockchain-escrow/shared";
import { usePathname, useSearchParams } from "next/navigation";

type LanguageSwitcherProps = {
  ariaLabel: string;
  currentLocale: Locale;
  label: string;
  localeLabels: Record<Locale, string>;
};

export function LanguageSwitcher(props: LanguageSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;

  return (
    <div aria-label={props.ariaLabel} className="language-switcher" role="group">
      <span className="language-switcher-label">{props.label}</span>
      <div className="language-switcher-track">
        {(Object.keys(props.localeLabels) as Locale[]).map((locale) => (
          <form action="/api/preferences/locale" key={locale} method="POST">
            <input name="locale" type="hidden" value={locale} />
            <input name="returnTo" type="hidden" value={currentPath} />
            <button
              aria-pressed={props.currentLocale === locale}
              className={`language-switcher-option${
                props.currentLocale === locale ? " language-switcher-option-active" : ""
              }`}
              type="submit"
            >
              {props.localeLabels[locale]}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
