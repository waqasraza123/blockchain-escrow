import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res
} from "@nestjs/common";
import type {
  AuthNonceResponse,
  AuthVerifyResponse,
  LogoutResponse,
  MeResponse
} from "@blockchain-escrow/shared";

import {
  readRequestMetadata,
  type HttpRequestLike,
  type HttpResponseLike
} from "./auth.http";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("nonce")
  async createNonce(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<AuthNonceResponse> {
    return this.authService.issueNonce(body, readRequestMetadata(request));
  }

  @Post("verify")
  async verify(
    @Body() body: unknown,
    @Req() request: HttpRequestLike,
    @Res({ passthrough: true }) response: HttpResponseLike
  ): Promise<AuthVerifyResponse> {
    const result = await this.authService.verifySession(
      body,
      readRequestMetadata(request)
    );

    response.header("Set-Cookie", result.setCookieHeader);

    return result.response;
  }

  @Get("me")
  async getMe(@Req() request: HttpRequestLike): Promise<MeResponse> {
    return this.authService.getCurrentSession(readRequestMetadata(request));
  }

  @Post("logout")
  async logout(
    @Req() request: HttpRequestLike,
    @Res({ passthrough: true }) response: HttpResponseLike
  ): Promise<LogoutResponse> {
    const result = await this.authService.logout(readRequestMetadata(request));

    response.header("Set-Cookie", result.setCookieHeader);

    return result.response;
  }
}
