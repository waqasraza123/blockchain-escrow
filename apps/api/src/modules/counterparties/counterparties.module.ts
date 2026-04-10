import { Module } from "@nestjs/common";

import { ApprovalsModule } from "../approvals/approvals.module";
import { AuthModule } from "../auth/auth.module";
import { CounterpartiesController } from "./counterparties.controller";
import { CounterpartiesService } from "./counterparties.service";

@Module({
  imports: [AuthModule, ApprovalsModule],
  controllers: [CounterpartiesController],
  providers: [CounterpartiesService]
})
export class CounterpartiesModule {}
