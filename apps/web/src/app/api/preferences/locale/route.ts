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

function resolveRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();

  if (host) {
    return `${forwardedProto || "http"}://${host}`;
  }

  const referer = request.headers.get("referer");

  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // Fall through to request.url when referer is malformed.
    }
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = normalizeLocale(formData.get("locale")?.toString() ?? defaultLocale);
  const returnTo = sanitizeReturnTo(formData.get("returnTo")?.toString() ?? "/");
  const response = NextResponse.redirect(new URL(returnTo, resolveRequestOrigin(request)));

  response.cookies.set(localeCookieName, locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
