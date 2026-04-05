import test from "node:test";
import assert from "node:assert/strict";

import {
  getDeploymentManifestByChainId
} from "@blockchain-escrow/contracts-sdk";
import type {
  ArbitratorRegistryEntryRecord,
  ChainCursorRecord,
  ContractOwnershipRecord,
  EscrowAgreementRecord,
  FeeVaultStateRecord,
  IndexedBlockRecord,
  IndexedContractEventRecord,
  IndexedTransactionRecord,
  ProtocolConfigStateRecord,
  Release4Repositories,
  TokenAllowlistEntryRecord
} from "@blockchain-escrow/db";

import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { DraftsService } from "../src/modules/drafts/drafts.service";
import { FundingService } from "../src/modules/funding/funding.service";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";

class InMemoryRelease4Repositories implements Release4Repositories {
  readonly arbitratorRegistryEntries = {
    listApprovedByChainIdAndContract: async (
      chainId: number,
      arbitratorRegistryAddress: string
    ) =>
      this.arbitratorRegistryEntriesStore.filter(
        (record) =>
          record.chainId === chainId &&
          record.arbitratorRegistryAddress === arbitratorRegistryAddress &&
          record.isApproved
      ),
    listByChainId: async (chainId: number) =>
      this.arbitratorRegistryEntriesStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.arbitratorRegistryEntriesStore = this.arbitratorRegistryEntriesStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: ArbitratorRegistryEntryRecord) => {
      this.arbitratorRegistryEntriesStore = this.arbitratorRegistryEntriesStore.filter(
        (entry) =>
          !(
            entry.chainId === record.chainId &&
            entry.arbitratorRegistryAddress === record.arbitratorRegistryAddress &&
            entry.arbitrator === record.arbitrator
          )
      );
      this.arbitratorRegistryEntriesStore.push(record);
      return record;
    }
  };

  readonly chainCursors = {
    findByChainIdAndCursorKey: async (
      chainId: number,
      cursorKey: string
    ): Promise<ChainCursorRecord | null> => {
      void chainId;
      void cursorKey;
      return null;
    },
    upsert: async (record: ChainCursorRecord) => record
  };

  readonly contractOwnerships = {
    listByChainId: async (chainId: number) =>
      this.contractOwnershipsStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.contractOwnershipsStore = this.contractOwnershipsStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: ContractOwnershipRecord) => {
      this.contractOwnershipsStore = this.contractOwnershipsStore.filter(
        (entry) =>
          !(entry.chainId === record.chainId && entry.contractAddress === record.contractAddress)
      );
      this.contractOwnershipsStore.push(record);
      return record;
    }
  };

  readonly escrowAgreements = {
    findByChainIdAndAddress: async (chainId: number, agreementAddress: string) =>
      this.escrowAgreementsStore.find(
        (record) =>
          record.chainId === chainId && record.agreementAddress === agreementAddress
      ) ?? null,
    listByChainId: async (chainId: number) =>
      this.escrowAgreementsStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.escrowAgreementsStore = this.escrowAgreementsStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: EscrowAgreementRecord) => {
      this.escrowAgreementsStore = this.escrowAgreementsStore.filter(
        (entry) =>
          !(entry.chainId === record.chainId && entry.agreementAddress === record.agreementAddress)
      );
      this.escrowAgreementsStore.push(record);
      return record;
    }
  };

  readonly feeVaultStates = {
    findByChainIdAndAddress: async (chainId: number, feeVaultAddress: string) =>
      this.feeVaultStatesStore.find(
        (record) => record.chainId === chainId && record.feeVaultAddress === feeVaultAddress
      ) ?? null,
    listByChainId: async (chainId: number) =>
      this.feeVaultStatesStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.feeVaultStatesStore = this.feeVaultStatesStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: FeeVaultStateRecord) => {
      this.feeVaultStatesStore = this.feeVaultStatesStore.filter(
        (entry) =>
          !(entry.chainId === record.chainId && entry.feeVaultAddress === record.feeVaultAddress)
      );
      this.feeVaultStatesStore.push(record);
      return record;
    }
  };

  readonly indexedBlocks = {
    deleteFromBlockNumber: async (chainId: number, fromBlockNumber: string) => {
      void chainId;
      void fromBlockNumber;
    },
    findByChainIdAndBlockNumber: async (
      chainId: number,
      blockNumber: string
    ): Promise<IndexedBlockRecord | null> => {
      void chainId;
      void blockNumber;
      return null;
    },
    listByChainId: async (chainId: number): Promise<IndexedBlockRecord[]> => {
      void chainId;
      return [];
    },
    upsertMany: async (records: IndexedBlockRecord[]) => {
      void records;
    }
  };

  readonly indexedContractEvents = {
    deleteFromBlockNumber: async (chainId: number, fromBlockNumber: string) => {
      void chainId;
      void fromBlockNumber;
    },
    listByChainId: async (chainId: number): Promise<IndexedContractEventRecord[]> => {
      void chainId;
      return [];
    },
    upsertMany: async (records: IndexedContractEventRecord[]) => {
      void records;
    }
  };

  readonly indexedTransactions = {
    deleteFromBlockNumber: async (chainId: number, fromBlockNumber: string) => {
      void chainId;
      void fromBlockNumber;
    },
    upsertMany: async (records: IndexedTransactionRecord[]) => {
      void records;
    }
  };

  readonly protocolConfigStates = {
    findByChainIdAndAddress: async (chainId: number, protocolConfigAddress: string) =>
      this.protocolConfigStatesStore.find(
        (record) =>
          record.chainId === chainId &&
          record.protocolConfigAddress === protocolConfigAddress
      ) ?? null,
    listByChainId: async (chainId: number) =>
      this.protocolConfigStatesStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.protocolConfigStatesStore = this.protocolConfigStatesStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: ProtocolConfigStateRecord) => {
      this.protocolConfigStatesStore = this.protocolConfigStatesStore.filter(
        (entry) =>
          !(
            entry.chainId === record.chainId &&
            entry.protocolConfigAddress === record.protocolConfigAddress
          )
      );
      this.protocolConfigStatesStore.push(record);
      return record;
    }
  };

  readonly tokenAllowlistEntries = {
    listAllowedByChainIdAndContract: async (
      chainId: number,
      tokenAllowlistAddress: string
    ) =>
      this.tokenAllowlistEntriesStore.filter(
        (record) =>
          record.chainId === chainId &&
          record.tokenAllowlistAddress === tokenAllowlistAddress &&
          record.isAllowed
      ),
    listByChainId: async (chainId: number) =>
      this.tokenAllowlistEntriesStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.tokenAllowlistEntriesStore = this.tokenAllowlistEntriesStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: TokenAllowlistEntryRecord) => {
      this.tokenAllowlistEntriesStore = this.tokenAllowlistEntriesStore.filter(
        (entry) =>
          !(
            entry.chainId === record.chainId &&
            entry.tokenAllowlistAddress === record.tokenAllowlistAddress &&
            entry.token === record.token
          )
      );
      this.tokenAllowlistEntriesStore.push(record);
      return record;
    }
  };

  private arbitratorRegistryEntriesStore: ArbitratorRegistryEntryRecord[] = [];
  private contractOwnershipsStore: ContractOwnershipRecord[] = [];
  private escrowAgreementsStore: EscrowAgreementRecord[] = [];
  private feeVaultStatesStore: FeeVaultStateRecord[] = [];
  private protocolConfigStatesStore: ProtocolConfigStateRecord[] = [];
  private tokenAllowlistEntriesStore: TokenAllowlistEntryRecord[] = [];
}

async function seedOrganizationMembership(
  repositories: InMemoryRelease1Repositories,
  options: {
    createdByUserId: string;
    organizationId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    userId: string;
  }
) {
  const now = new Date().toISOString();

  if (!(await repositories.organizations.findById(options.organizationId))) {
    await repositories.organizations.create({
      createdAt: now,
      createdByUserId: options.createdByUserId,
      id: options.organizationId,
      name: options.organizationId,
      slug: options.organizationId,
      updatedAt: now
    });
  }

  if (
    !(await repositories.organizationMembers.findMembership(
      options.organizationId,
      options.userId
    ))
  ) {
    await repositories.organizationMembers.add({
      createdAt: now,
      id: `member-${options.userId}-${options.organizationId}`,
      organizationId: options.organizationId,
      role: options.role,
      updatedAt: now,
      userId: options.userId
    });
  }
}

function createServices() {
  const release1Repositories = new InMemoryRelease1Repositories();
  const release4Repositories = new InMemoryRelease4Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    release1Repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    draftsService: new DraftsService(release1Repositories, authenticatedSessionService),
    fundingService: new FundingService(
      release1Repositories,
      release4Repositories,
      authenticatedSessionService
    ),
    release1Repositories,
    release4Repositories,
    sessionTokenService
  };
}

async function seedFundingScenario() {
  const services = createServices();
  const actor = await seedAuthenticatedActor(
    services.release1Repositories,
    services.sessionTokenService
  );
  const now = new Date().toISOString();
  const manifest = getDeploymentManifestByChainId(84532);

  if (!manifest) {
    throw new Error("missing base sepolia manifest");
  }

  await seedOrganizationMembership(services.release1Repositories, {
    createdByUserId: actor.userId,
    organizationId: "org-1",
    role: "OWNER",
    userId: actor.userId
  });
  await services.release1Repositories.counterparties.create({
    contactEmail: "vendor@example.com",
    createdAt: now,
    createdByUserId: actor.userId,
    id: "counterparty-1",
    legalName: null,
    name: "Vendor One",
    normalizedName: "vendor one",
    organizationId: "org-1",
    updatedAt: now
  });

  const draft = await services.draftsService.createDraft(
    "org-1",
    {
      counterpartyId: "counterparty-1",
      organizationRole: "BUYER",
      settlementCurrency: "USDC",
      title: "Website Rebuild"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const version = await services.draftsService.createVersionSnapshot(
    {
      draftDealId: draft.draft.id,
      organizationId: "org-1"
    },
    {
      bodyMarkdown: "# Final terms",
      milestoneSnapshots: [
        {
          amountMinor: "1000000",
          title: "Design phase"
        },
        {
          amountMinor: "2500000",
          title: "Build phase"
        }
      ]
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  await services.draftsService.createVersionAcceptance(
    {
      dealVersionId: version.version.id,
      draftDealId: draft.draft.id,
      organizationId: "org-1"
    },
    {
      scheme: "EIP712",
      signature: "0xabcdef1234567890",
      typedData: {
        domain: {
          chainId: 84532,
          name: "Blockchain Escrow",
          version: "1"
        },
        message: {
          dealVersionId: version.version.id,
          intent: "ACCEPT_DEAL_VERSION"
        },
        primaryType: "DealVersionAcceptance",
        types: {
          DealVersionAcceptance: [
            { name: "dealVersionId", type: "string" },
            { name: "intent", type: "string" }
          ]
        }
      }
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  await services.release4Repositories.protocolConfigStates.upsert({
    arbitratorRegistryAddress: manifest.contracts.ArbitratorRegistry!.toLowerCase() as `0x${string}`,
    chainId: 84532,
    createEscrowPaused: false,
    feeVaultAddress: manifest.contracts.FeeVault!.toLowerCase() as `0x${string}`,
    fundingPaused: false,
    owner: "0x1111111111111111111111111111111111111111",
    pendingOwner: null,
    protocolConfigAddress: manifest.contracts.ProtocolConfig!.toLowerCase() as `0x${string}`,
    protocolFeeBps: manifest.protocolFeeBps,
    tokenAllowlistAddress: manifest.contracts.TokenAllowlist!.toLowerCase() as `0x${string}`,
    treasuryAddress: manifest.treasury!.toLowerCase() as `0x${string}`,
    updatedAt: now,
    updatedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    updatedBlockNumber: "1",
    updatedLogIndex: 0,
    updatedTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  });
  await services.release4Repositories.tokenAllowlistEntries.upsert({
    chainId: 84532,
    isAllowed: true,
    token: manifest.usdcToken!.toLowerCase() as `0x${string}`,
    tokenAllowlistAddress: manifest.contracts.TokenAllowlist!.toLowerCase() as `0x${string}`,
    updatedAt: now,
    updatedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    updatedBlockNumber: "1",
    updatedLogIndex: 1,
    updatedTransactionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  });

  return {
    actor,
    draft,
    manifest,
    services,
    version
  };
}

test("funding service returns a ready preparation when projections and counterparty wallet exist", async () => {
  const { actor, draft, manifest, services, version } = await seedFundingScenario();

  await services.draftsService.updateCounterpartyWallet(
    {
      draftDealId: draft.draft.id,
      organizationId: "org-1"
    },
    {
      walletAddress: "0x3333333333333333333333333333333333333333"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const result = await services.fundingService.getFundingPreparation(
    {
      dealVersionId: version.version.id,
      draftDealId: draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(result.preparation.ready, true);
  assert.deepEqual(result.preparation.blockers, []);
  assert.equal(
    result.preparation.escrowFactoryAddress,
    manifest.contracts.EscrowFactory!.toLowerCase()
  );
  assert.equal(
    result.preparation.protocolConfigAddress,
    manifest.contracts.ProtocolConfig!.toLowerCase()
  );
  assert.equal(
    result.preparation.settlementTokenAddress,
    manifest.usdcToken!.toLowerCase()
  );
  assert.equal(result.preparation.buyerAddress, actor.walletAddress);
  assert.equal(
    result.preparation.sellerAddress,
    "0x3333333333333333333333333333333333333333"
  );
  assert.equal(result.preparation.totalAmountMinor, "3500000");
  assert.equal(result.preparation.milestoneCount, 2);
  assert.equal(
    result.preparation.createAgreementTransaction?.to,
    manifest.contracts.EscrowFactory!.toLowerCase()
  );
  assert.match(result.preparation.dealId, /^0x[a-f0-9]{64}$/);
  assert.match(result.preparation.dealVersionHash, /^0x[a-f0-9]{64}$/);
  assert.match(
    result.preparation.predictedAgreementAddress ?? "",
    /^0x[a-f0-9]{40}$/
  );
});

test("funding service reports blockers when the draft counterparty wallet is missing", async () => {
  const { actor, draft, services, version } = await seedFundingScenario();

  const result = await services.fundingService.getFundingPreparation(
    {
      dealVersionId: version.version.id,
      draftDealId: draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(result.preparation.ready, false);
  assert.ok(result.preparation.blockers.includes("COUNTERPARTY_WALLET_MISSING"));
  assert.equal(result.preparation.createAgreementTransaction, null);
});
