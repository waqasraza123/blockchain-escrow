import { Controller, Get, Param, Req } from "@nestjs/common";
import type { ListAuditLogsResponse } from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { AuditService } from "./audit.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("entities/:entityType/:entityId")
  async listByEntity(
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListAuditLogsResponse> {
    return this.auditService.listByEntity(
      { entityId, entityType },
      readRequestMetadata(request)
    );
  }
}
