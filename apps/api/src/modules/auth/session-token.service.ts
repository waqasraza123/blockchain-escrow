import { createHash, createHmac } from "node:crypto";

import type { SessionTokenPayload, SessionTokenService } from "@blockchain-escrow/security";
import { Injectable } from "@nestjs/common";

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

@Injectable()
export class HmacSessionTokenService implements SessionTokenService {
  private readonly secret: string;

  constructor() {
    this.secret =
      process.env.API_SESSION_SECRET ||
      (process.env.NODE_ENV === "production"
        ? ""
        : "development-session-secret-change-me");

    if (!this.secret) {
      throw new Error("API_SESSION_SECRET must be configured in production.");
    }
  }

  async create(payload: SessionTokenPayload): Promise<string> {
    const encodedPayload = toBase64Url(JSON.stringify(payload));
    const signature = createHmac("sha256", this.secret)
      .update(encodedPayload)
      .digest("base64url");

    return `${encodedPayload}.${signature}`;
  }

  async hash(token: string): Promise<string> {
    return createHash("sha256").update(token).digest("hex");
  }
}
