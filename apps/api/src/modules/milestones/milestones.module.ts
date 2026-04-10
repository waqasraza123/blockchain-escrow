import { forwardRef, Module } from "@nestjs/common";

import { ApprovalsModule } from "../approvals/approvals.module";
import { AuthModule } from "../auth/auth.module";
import { MilestonesController } from "./milestones.controller";
import { MilestonesService } from "./milestones.service";
import {
  loadMilestoneReviewConfiguration,
  loadMilestoneSettlementExecutionReconciliationConfiguration,
  MILESTONE_REVIEW_CONFIGURATION,
  MILESTONE_SETTLEMENT_EXECUTION_RECONCILIATION_CONFIGURATION
} from "./milestones.tokens";

@Module({
  imports: [AuthModule, forwardRef(() => ApprovalsModule)],
  controllers: [MilestonesController],
  providers: [
    MilestonesService,
    {
      provide: MILESTONE_REVIEW_CONFIGURATION,
      useFactory: loadMilestoneReviewConfiguration
    },
    {
      provide: MILESTONE_SETTLEMENT_EXECUTION_RECONCILIATION_CONFIGURATION,
      useFactory: loadMilestoneSettlementExecutionReconciliationConfiguration
    }
  ],
  exports: [MilestonesService]
})
export class MilestonesModule {}
