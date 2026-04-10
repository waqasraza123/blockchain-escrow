import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { FundingModule } from "../funding/funding.module";
import { MilestonesModule } from "../milestones/milestones.module";
import { SponsorshipController } from "./sponsorship.controller";
import { SponsorshipService } from "./sponsorship.service";

@Module({
  imports: [AuthModule, FundingModule, MilestonesModule],
  controllers: [SponsorshipController],
  providers: [SponsorshipService],
  exports: [SponsorshipService]
})
export class SponsorshipModule {}
