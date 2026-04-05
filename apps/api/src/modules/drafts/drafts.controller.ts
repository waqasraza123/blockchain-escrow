import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type {
  CreateDealVersionAcceptanceResponse,
  CreateDealVersionResponse,
  CreateDraftDealResponse,
  DraftDealDetailResponse,
  ListDealVersionAcceptancesResponse,
  ListDraftDealsResponse,
  UpdateDraftCounterpartyWalletResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { DraftsService } from "./drafts.service";

@Controller("organizations/:organizationId/drafts")
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Get()
  async listDrafts(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListDraftDealsResponse> {
    return this.draftsService.listDrafts(
      { organizationId },
      readRequestMetadata(request)
    );
  }

  @Get(":draftDealId")
  async getDraft(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Req() request: HttpRequestLike
  ): Promise<DraftDealDetailResponse> {
    return this.draftsService.getDraft(
      { draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Post()
  async createDraft(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDraftDealResponse> {
    return this.draftsService.createDraft(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }

  @Post(":draftDealId/version-snapshots")
  async createVersionSnapshot(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealVersionResponse> {
    return this.draftsService.createVersionSnapshot(
      { draftDealId, organizationId },
      body,
      readRequestMetadata(request)
    );
  }

  @Get(":draftDealId/versions/:dealVersionId/acceptances")
  async listVersionAcceptances(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListDealVersionAcceptancesResponse> {
    return this.draftsService.listVersionAcceptances(
      { dealVersionId, draftDealId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Post(":draftDealId/versions/:dealVersionId/acceptances")
  async createVersionAcceptance(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Param("dealVersionId") dealVersionId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateDealVersionAcceptanceResponse> {
    return this.draftsService.createVersionAcceptance(
      { dealVersionId, draftDealId, organizationId },
      body,
      readRequestMetadata(request)
    );
  }

  @Patch(":draftDealId/counterparty-wallet")
  async updateCounterpartyWallet(
    @Param("organizationId") organizationId: string,
    @Param("draftDealId") draftDealId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<UpdateDraftCounterpartyWalletResponse> {
    return this.draftsService.updateCounterpartyWallet(
      { draftDealId, organizationId },
      body,
      readRequestMetadata(request)
    );
  }
}
