import { forwardRef, Module } from "@nestjs/common";

import { PersistenceModule } from "../../infrastructure/persistence.module";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AuthModule } from "../auth/auth.module";
import { DraftsModule } from "../drafts/drafts.module";
import { FundingModule } from "../funding/funding.module";
import { MilestonesModule } from "../milestones/milestones.module";
import { TenantModule } from "../tenant/tenant.module";
import { PartnerAuthService } from "./partner-auth.service";
import { PartnerController, PartnerHostedController } from "./partner.controller";
import { PartnerEventsService } from "./partner-events.service";
import { PartnerHostedService } from "./partner-hosted.service";
import { PartnerService } from "./partner.service";
import {
  loadPartnerConfiguration,
  PARTNER_CONFIGURATION
} from "./partner.tokens";

@Module({
  imports: [
    PersistenceModule,
    AuthModule,
    DraftsModule,
    FundingModule,
    ApprovalsModule,
    TenantModule,
    forwardRef(() => MilestonesModule)
  ],
  controllers: [PartnerController, PartnerHostedController],
  providers: [
    PartnerAuthService,
    PartnerEventsService,
    PartnerHostedService,
    PartnerService,
    {
      provide: PARTNER_CONFIGURATION,
      useFactory: loadPartnerConfiguration
    }
  ],
  exports: [PartnerAuthService, PartnerEventsService]
})
export class PartnerModule {}
