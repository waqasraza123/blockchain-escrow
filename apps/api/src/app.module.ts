import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { UsersModule } from "./modules/users/users.module";
import { WalletsModule } from "./modules/wallets/wallets.module";

@Module({
  imports: [
    AuthModule,
    UsersModule,
    WalletsModule,
    OrganizationsModule,
    AuditModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
