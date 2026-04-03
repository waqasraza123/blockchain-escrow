import { Module } from "@nestjs/common";

import { PersistenceModule } from "../../infrastructure/persistence.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthenticatedSessionService } from "./authenticated-session.service";
import {
  AUTH_CONFIGURATION,
  SESSION_TOKEN_SERVICE,
  SIWE_POLICY_CONFIGURATION,
  SIWE_VERIFIER,
  loadAuthConfiguration,
  loadSiwePolicyConfiguration
} from "./auth.tokens";
import { HmacSessionTokenService } from "./session-token.service";
import { ViemSiweVerifier } from "./siwe-verifier.service";

@Module({
  imports: [PersistenceModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthenticatedSessionService,
    {
      provide: AUTH_CONFIGURATION,
      useFactory: loadAuthConfiguration
    },
    {
      provide: SESSION_TOKEN_SERVICE,
      useClass: HmacSessionTokenService
    },
    {
      provide: SIWE_POLICY_CONFIGURATION,
      useFactory: loadSiwePolicyConfiguration
    },
    {
      provide: SIWE_VERIFIER,
      useClass: ViemSiweVerifier
    }
  ],
  exports: [AuthenticatedSessionService]
})
export class AuthModule {}
