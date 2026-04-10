import {
  defaultLocale,
  getLocaleDirection,
  isLocale,
  localeCookieName,
  type Locale
} from "@blockchain-escrow/shared";
import { cookies } from "next/headers";
import { cache } from "react";

import { adminMessages } from "./messages";

export const getI18n = cache(async () => {
  const cookieStore = await cookies();
  const selectedLocale = cookieStore.get(localeCookieName)?.value;
  const locale: Locale = isLocale(selectedLocale) ? selectedLocale : defaultLocale;

  return {
    dir: getLocaleDirection(locale),
    locale,
    messages: adminMessages[locale]
  };
});
