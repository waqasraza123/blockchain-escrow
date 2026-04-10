import { Controller, Get, Query, Req } from "@nestjs/common";
import type { TenantPublicContextResponse } from "@blockchain-escrow/shared";

import type { HttpRequestLike } from "../auth/auth.http";
import { TenantService } from "./tenant.service";

@Controller("public")
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get("tenant-context")
  async getTenantContext(
    @Query("slug") slug: string | undefined,
    @Req() request: HttpRequestLike
  ): Promise<TenantPublicContextResponse> {
    return this.tenantService.resolvePublicContext({
      headers: request.headers,
      slug: slug?.trim() || null
    });
  }
}
