import { Controller, Get, Req } from "@nestjs/common";
import type { CurrentUserResponse } from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  async getCurrentUser(
    @Req() request: HttpRequestLike
  ): Promise<CurrentUserResponse> {
    return this.usersService.getCurrentUser(readRequestMetadata(request));
  }
}
