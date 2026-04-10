export const supportedLocales = ["en", "ar"] as const;

export type Locale = (typeof supportedLocales)[number];
export type TextDirection = "ltr" | "rtl";

export const defaultLocale: Locale = "en";
export const localeCookieName = "bes_locale";

export const localeLabels: Record<
  Locale,
  { englishName: string; nativeName: string }
> = {
  ar: {
    englishName: "Arabic",
    nativeName: "العربية"
  },
  en: {
    englishName: "English",
    nativeName: "English"
  }
};

export function isLocale(value: string | null | undefined): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function isRtlLocale(locale: Locale): boolean {
  return locale === "ar";
}

export function getLocaleDirection(locale: Locale): TextDirection {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}
