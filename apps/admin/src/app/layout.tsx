import type { Metadata } from "next";
import type { ReactNode } from "react";

import { I18nProvider } from "../lib/i18n/provider";
import { getI18n } from "../lib/i18n/server";

import "./globals.css";

type RootLayoutProps = {
  children: ReactNode;
};

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getI18n();

  return {
    description: messages.metadata.description,
    title: messages.metadata.title
  };
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const { dir, locale, messages } = await getI18n();

  return (
    <html dir={dir} lang={locale}>
      <body>
        <I18nProvider dir={dir} locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
