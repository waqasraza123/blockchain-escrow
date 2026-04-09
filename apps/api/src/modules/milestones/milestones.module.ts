import { Module } from "@nestjs/common";

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
  imports: [AuthModule],
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
  ]
})
export class MilestonesModule {}
