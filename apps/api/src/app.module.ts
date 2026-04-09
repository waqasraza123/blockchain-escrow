import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CounterpartiesModule } from "./modules/counterparties/counterparties.module";
import { DraftsModule } from "./modules/drafts/drafts.module";
import { FilesModule } from "./modules/files/files.module";
import { FundingModule } from "./modules/funding/funding.module";
import { MilestonesModule } from "./modules/milestones/milestones.module";
import { OperatorModule } from "./modules/operator/operator.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { TemplatesModule } from "./modules/templates/templates.module";
import { UsersModule } from "./modules/users/users.module";
import { WalletsModule } from "./modules/wallets/wallets.module";

@Module({
  imports: [
    AuthModule,
    UsersModule,
    WalletsModule,
    CounterpartiesModule,
    DraftsModule,
    FundingModule,
    MilestonesModule,
    OperatorModule,
    FilesModule,
    OrganizationsModule,
    TemplatesModule,
    AuditModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
