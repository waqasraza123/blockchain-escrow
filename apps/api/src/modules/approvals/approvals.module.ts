import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { MilestonesModule } from "../milestones/milestones.module";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";

@Module({
  imports: [AuthModule, MilestonesModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService]
})
export class ApprovalsModule {}
