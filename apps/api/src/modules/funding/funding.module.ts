import { Module } from "@nestjs/common";

import { ApprovalsModule } from "../approvals/approvals.module";
import { AuthModule } from "../auth/auth.module";
import { FundingController } from "./funding.controller";
import {
  FUNDING_CHAIN_READER,
  loadFundingChainReader
} from "./funding-chain-reader";
import { FundingService } from "./funding.service";
import {
  FUNDING_RECONCILIATION_CONFIGURATION,
  loadFundingReconciliationConfiguration
} from "./funding.tokens";

@Module({
  imports: [AuthModule, ApprovalsModule],
  controllers: [FundingController],
  providers: [
    FundingService,
    {
      provide: FUNDING_RECONCILIATION_CONFIGURATION,
      useFactory: loadFundingReconciliationConfiguration
    },
    {
      provide: FUNDING_CHAIN_READER,
      useFactory: loadFundingChainReader
    }
  ],
  exports: [FUNDING_RECONCILIATION_CONFIGURATION]
})
export class FundingModule {}
