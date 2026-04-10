import { Module } from "@nestjs/common";

import { ApprovalsModule } from "../approvals/approvals.module";
import { AuthModule } from "../auth/auth.module";
import { TemplatesController } from "./templates.controller";
import { TemplatesService } from "./templates.service";

@Module({
  imports: [AuthModule, ApprovalsModule],
  controllers: [TemplatesController],
  providers: [TemplatesService]
})
export class TemplatesModule {}
