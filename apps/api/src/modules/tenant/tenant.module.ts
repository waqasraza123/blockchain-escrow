import { Module } from "@nestjs/common";

import { PersistenceModule } from "../../infrastructure/persistence.module";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";

@Module({
  imports: [PersistenceModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService]
})
export class TenantModule {}
