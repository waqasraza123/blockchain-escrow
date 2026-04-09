import {
  createPrismaClient,
  createPrismaRelease4Repositories,
  createRelease1Repositories,
  createRelease8Repositories
} from "@blockchain-escrow/db";
import { Global, Injectable, Module, OnModuleDestroy } from "@nestjs/common";

import {
  RELEASE1_REPOSITORIES,
  RELEASE4_REPOSITORIES,
  RELEASE8_REPOSITORIES
} from "./tokens";

type PrismaClientInstance = ReturnType<typeof createPrismaClient>;

@Injectable()
class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClientInstance = createPrismaClient();

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: RELEASE1_REPOSITORIES,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        createRelease1Repositories(prisma.client)
    },
    {
      provide: RELEASE4_REPOSITORIES,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        createPrismaRelease4Repositories(prisma.client)
    },
    {
      provide: RELEASE8_REPOSITORIES,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        createRelease8Repositories(prisma.client)
    }
  ],
  exports: [
    PrismaService,
    RELEASE1_REPOSITORIES,
    RELEASE4_REPOSITORIES,
    RELEASE8_REPOSITORIES
  ]
})
export class PersistenceModule {}
