import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { FundingController } from "./funding.controller";
import { FundingService } from "./funding.service";
import {
  FUNDING_RECONCILIATION_CONFIGURATION,
  loadFundingReconciliationConfiguration
} from "./funding.tokens";

@Module({
  imports: [AuthModule],
  controllers: [FundingController],
  providers: [
    FundingService,
    {
      provide: FUNDING_RECONCILIATION_CONFIGURATION,
      useFactory: loadFundingReconciliationConfiguration
    }
  ],
  exports: [FUNDING_RECONCILIATION_CONFIGURATION]
})
export class FundingModule {}
