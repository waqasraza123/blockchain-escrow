import { NextResponse } from "next/server";

const defaultApiBaseUrl = "http://127.0.0.1:4000";
const hostedCookieName =
  process.env.API_PARTNER_HOSTED_COOKIE_NAME?.trim() || "bes_hosted_session";

function getApiBaseUrl(): string {
  return process.env.WEB_API_BASE_URL?.replace(/\/+$/u, "") ?? defaultApiBaseUrl;
}

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing field: ${key}`);
  }

  return value.trim();
}

function resolveRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();

  if (host) {
    return `${forwardedProto || "http"}://${host}`;
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const launchToken = requiredString(formData, "launchToken");
  const apiResponse = await fetch(
    `${getApiBaseUrl()}/hosted/sessions/${encodeURIComponent(launchToken)}/exchange`,
    {
      method: "POST"
    }
  );

  if (!apiResponse.ok) {
    return new NextResponse(await apiResponse.text(), {
      headers: {
        "Content-Type": apiResponse.headers.get("content-type") ?? "application/json"
      },
      status: apiResponse.status
    });
  }

  const exchanged = (await apiResponse.json()) as {
    expiresAt: string;
    sessionToken: string;
  };
  const response = NextResponse.redirect(
    new URL(`/hosted/${launchToken}/workspace`, resolveRequestOrigin(request))
  );

  response.cookies.set(hostedCookieName, exchanged.sessionToken, {
    expires: new Date(exchanged.expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
