import { Module } from "@nestjs/common";

import { PersistenceModule } from "../../infrastructure/persistence.module";
import { AuthModule } from "../auth/auth.module";
import { TenantModule } from "../tenant/tenant.module";
import { OperatorController } from "./operator.controller";
import { OperatorService } from "./operator.service";
import {
  loadOperatorConfiguration,
  OPERATOR_CONFIGURATION
} from "./operator.tokens";

@Module({
  imports: [AuthModule, PersistenceModule, TenantModule],
  controllers: [OperatorController],
  providers: [
    OperatorService,
    {
      provide: OPERATOR_CONFIGURATION,
      useFactory: loadOperatorConfiguration
    }
  ]
})
export class OperatorModule {}
