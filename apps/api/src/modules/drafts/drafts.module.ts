import { Module } from "@nestjs/common";

import { ApprovalsModule } from "../approvals/approvals.module";
import { AuthModule } from "../auth/auth.module";
import { DraftsController } from "./drafts.controller";
import { DraftsService } from "./drafts.service";
import {
  FUNDING_RECONCILIATION_CONFIGURATION,
  loadFundingReconciliationConfiguration
} from "../funding/funding.tokens";

@Module({
  imports: [AuthModule, ApprovalsModule],
  controllers: [DraftsController],
  providers: [
    DraftsService,
    {
      provide: FUNDING_RECONCILIATION_CONFIGURATION,
      useFactory: loadFundingReconciliationConfiguration
    }
  ],
  exports: [DraftsService]
})
export class DraftsModule {}
