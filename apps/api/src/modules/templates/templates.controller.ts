import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type {
  CreateTemplateResponse,
  ListTemplatesResponse,
  TemplateDetailResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { TemplatesService } from "./templates.service";

@Controller("organizations/:organizationId/templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async listTemplates(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListTemplatesResponse> {
    return this.templatesService.listTemplates(
      { organizationId },
      readRequestMetadata(request)
    );
  }

  @Get(":templateId")
  async getTemplate(
    @Param("organizationId") organizationId: string,
    @Param("templateId") templateId: string,
    @Req() request: HttpRequestLike
  ): Promise<TemplateDetailResponse> {
    return this.templatesService.getTemplate(
      { organizationId, templateId },
      readRequestMetadata(request)
    );
  }

  @Post()
  async createTemplate(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateTemplateResponse> {
    return this.templatesService.createTemplate(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }
}
