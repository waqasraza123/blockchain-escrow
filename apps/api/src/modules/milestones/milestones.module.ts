import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { MilestonesController } from "./milestones.controller";
import { MilestonesService } from "./milestones.service";
import {
  loadMilestoneReviewConfiguration,
  MILESTONE_REVIEW_CONFIGURATION
} from "./milestones.tokens";

@Module({
  imports: [AuthModule],
  controllers: [MilestonesController],
  providers: [
    MilestonesService,
    {
      provide: MILESTONE_REVIEW_CONFIGURATION,
      useFactory: loadMilestoneReviewConfiguration
    }
  ]
})
export class MilestonesModule {}
