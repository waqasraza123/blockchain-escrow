import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type {
  CreateFileResponse,
  FileDetailResponse,
  ListFilesResponse
} from "@blockchain-escrow/shared";

import { readRequestMetadata, type HttpRequestLike } from "../auth/auth.http";
import { FilesService } from "./files.service";

@Controller("organizations/:organizationId/files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async listFiles(
    @Param("organizationId") organizationId: string,
    @Req() request: HttpRequestLike
  ): Promise<ListFilesResponse> {
    return this.filesService.listFiles(
      { organizationId },
      readRequestMetadata(request)
    );
  }

  @Get(":fileId")
  async getFile(
    @Param("organizationId") organizationId: string,
    @Param("fileId") fileId: string,
    @Req() request: HttpRequestLike
  ): Promise<FileDetailResponse> {
    return this.filesService.getFile(
      { fileId, organizationId },
      readRequestMetadata(request)
    );
  }

  @Post()
  async createFile(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown,
    @Req() request: HttpRequestLike
  ): Promise<CreateFileResponse> {
    return this.filesService.createFile(
      organizationId,
      body,
      readRequestMetadata(request)
    );
  }
}
