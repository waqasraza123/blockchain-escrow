import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req
} from "@nestjs/common";
import type {
  AcceptOrganizationInviteResponse,
  CreateOrganizationInviteResponse,
  CreateOrganizationResponse,
  ListOrganizationMembershipsResponse,
  OrganizationDetailResponse,
  RemoveOrganizationMemberResponse,
  RevokeOrganizationInviteResponse,
  UpdateOrganizationMemberRoleResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async listMemberships(
    @Req() request: HttpRequestLike
  ): Promise<ListOrganizationMembershipsResponse> {
    return this.organizationsService.listMemberships(readRequestMetadata(request));
  }

  @Get(":organizationId")
  async getOrganizationDetail(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<OrganizationDetailResponse> {
    return this.organizationsService.getOrganizationDetail(
      organizationId,
      readRequestMetadata(request)
    );
  }

  @Post()
  async createOrganization(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateOrganizationResponse> {
    return this.organizationsService.createOrganization(
      body,
      readRequestMetadata(request)
    );
  }

  @Post(":organizationId/invites")
  async createInvite(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateOrganizationInviteResponse> {
    return this.organizationsService.createInvite(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }

  @Post("invites/accept")
  async acceptInvite(
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<AcceptOrganizationInviteResponse> {
    return this.organizationsService.acceptInvite(
      body,
      readRequestMetadata(request)
    );
  }

  @Post(":organizationId/invites/:inviteId/revoke")
  async revokeInvite(
    @Param("organizationId") organizationId: string,
    @Param("inviteId") inviteId: string,
    @Req() request: HttpRequestLike
  ): Promise<RevokeOrganizationInviteResponse> {
    return this.organizationsService.revokeInvite(
      organizationId,
      inviteId,
      readRequestMetadata(request)
    );
  }

  @Post(":organizationId/members/:memberId/remove")
  async removeMember(
    @Param("organizationId") organizationId: string,
    @Param("memberId") memberId: string,
    @Req() request: HttpRequestLike
  ): Promise<RemoveOrganizationMemberResponse> {
    return this.organizationsService.removeMember(
      organizationId,
      memberId,
      readRequestMetadata(request)
    );
  }

  @Patch(":organizationId/members/:memberId/role")
  async updateMemberRole(
    @Param("organizationId") organizationId: string,
    @Param("memberId") memberId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<UpdateOrganizationMemberRoleResponse> {
    return this.organizationsService.updateMemberRole(
      organizationId,
      memberId,
      body,
      readRequestMetadata(request)
    );
  }
}
