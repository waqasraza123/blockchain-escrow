import { forwardRef, Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { MilestonesModule } from "../milestones/milestones.module";
import { ApprovalRuntimeService } from "./approval-runtime.service";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";

@Module({
  imports: [AuthModule, forwardRef(() => MilestonesModule)],
  controllers: [ApprovalsController],
  providers: [ApprovalRuntimeService, ApprovalsService],
  exports: [ApprovalRuntimeService, ApprovalsService]
})
export class ApprovalsModule {}
