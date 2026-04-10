"use client";

import type { Locale, TextDirection } from "@blockchain-escrow/shared";
import { createContext, useContext } from "react";

import type { WebMessages } from "./messages";

type I18nContextValue = {
  dir: TextDirection;
  locale: Locale;
  messages: WebMessages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = I18nContextValue & {
  children: React.ReactNode;
};

export function I18nProvider({
  children,
  dir,
  locale,
  messages
}: I18nProviderProps) {
  return (
    <I18nContext.Provider value={{ dir, locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used within an I18nProvider.");
  }

  return value;
}
