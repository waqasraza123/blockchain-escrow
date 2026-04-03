export interface HttpRequestLike {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
}

export interface HttpResponseLike {
  header(name: string, value: string | readonly string[]): void;
}

export interface RequestMetadata {
  cookieHeader: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

function getHeaderValue(
  headers: HttpRequestLike["headers"],
  name: string
): string | null {
  const value = headers[name];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

export function readRequestMetadata(request: HttpRequestLike): RequestMetadata {
  const forwardedFor = getHeaderValue(request.headers, "x-forwarded-for");
  const ipAddress = forwardedFor
    ? forwardedFor.split(",")[0]?.trim() ?? null
    : request.ip ?? request.socket?.remoteAddress ?? null;

  return {
    cookieHeader: getHeaderValue(request.headers, "cookie"),
    ipAddress,
    userAgent: getHeaderValue(request.headers, "user-agent")
  };
}
