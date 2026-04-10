import {
  defaultLocale,
  localeCookieName,
  normalizeLocale
} from "@blockchain-escrow/shared";
import { NextResponse } from "next/server";

function sanitizeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = normalizeLocale(formData.get("locale")?.toString() ?? defaultLocale);
  const returnTo = sanitizeReturnTo(formData.get("returnTo")?.toString() ?? "/");
  const response = NextResponse.redirect(new URL(returnTo, request.url));

  response.cookies.set(localeCookieName, locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
