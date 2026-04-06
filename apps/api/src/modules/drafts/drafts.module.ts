import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DraftsController } from "./drafts.controller";
import { DraftsService } from "./drafts.service";
import {
  FUNDING_RECONCILIATION_CONFIGURATION,
  loadFundingReconciliationConfiguration
} from "../funding/funding.tokens";

@Module({
  imports: [AuthModule],
  controllers: [DraftsController],
  providers: [
    DraftsService,
    {
      provide: FUNDING_RECONCILIATION_CONFIGURATION,
      useFactory: loadFundingReconciliationConfiguration
    }
  ]
})
export class DraftsModule {}
