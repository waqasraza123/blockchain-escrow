import { NextRequest, NextResponse } from "next/server";

const defaultApiBaseUrl = "http://127.0.0.1:4000";

function getApiBaseUrl(): string {
  return process.env.WEB_API_BASE_URL?.replace(/\/+$/u, "") ?? defaultApiBaseUrl;
}

export async function POST(request: NextRequest) {
  const response = await fetch(`${getApiBaseUrl()}/auth/verify`, {
    body: await request.text(),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const nextResponse = new NextResponse(await response.text(), {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json"
    },
    status: response.status
  });
  const setCookie = response.headers.get("set-cookie");

  if (setCookie) {
    nextResponse.headers.set("set-cookie", setCookie);
  }

  return nextResponse;
}
