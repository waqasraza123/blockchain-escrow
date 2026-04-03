import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type {
  CounterpartyDetailResponse,
  CreateCounterpartyResponse,
  ListCounterpartiesResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { CounterpartiesService } from "./counterparties.service";

@Controller("organizations/:organizationId/counterparties")
export class CounterpartiesController {
  constructor(
    private readonly counterpartiesService: CounterpartiesService
  ) {}

  @Get()
  async listCounterparties(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListCounterpartiesResponse> {
    return this.counterpartiesService.listCounterparties(
      { organizationId },
      readRequestMetadata(request)
    );
  }

  @Get(":counterpartyId")
  async getCounterparty(
    @Param("organizationId") organizationId: string,
    @Param("counterpartyId") counterpartyId: string,
    @Req() request: HttpRequestLike
  ): Promise<CounterpartyDetailResponse> {
    return this.counterpartiesService.getCounterparty(
      { counterpartyId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Post()
  async createCounterparty(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateCounterpartyResponse> {
    return this.counterpartiesService.createCounterparty(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }
}
