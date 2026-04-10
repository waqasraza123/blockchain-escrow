import {
  defaultLocale,
  getLocaleDirection,
  isLocale,
  type Locale
} from "@blockchain-escrow/shared";
import { cookies } from "next/headers";
import { cache } from "react";

import { localeCookieName } from "@blockchain-escrow/shared";

import { webMessages } from "./messages";

export const getI18n = cache(async () => {
  const cookieStore = await cookies();
  const selectedLocale = cookieStore.get(localeCookieName)?.value;
  const locale: Locale = isLocale(selectedLocale) ? selectedLocale : defaultLocale;

  return {
    dir: getLocaleDirection(locale),
    locale,
    messages: webMessages[locale]
  };
});
