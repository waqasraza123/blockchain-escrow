import { Module } from "@nestjs/common";

import { ApprovalsModule } from "../approvals/approvals.module";
import { AuthModule } from "../auth/auth.module";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [AuthModule, ApprovalsModule],
  controllers: [FilesController],
  providers: [FilesService]
})
export class FilesModule {}
