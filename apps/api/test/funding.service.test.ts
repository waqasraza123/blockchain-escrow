import test from "node:test";
import assert from "node:assert/strict";

import {
  getDeploymentManifestByChainId
} from "@blockchain-escrow/contracts-sdk";
import { privateKeyToAccount } from "viem/accounts";

import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { buildCanonicalDealId } from "../src/modules/drafts/deal-identity";
import { DraftsService } from "../src/modules/drafts/drafts.service";
import { FundingService } from "../src/modules/funding/funding.service";
import type { FundingReconciliationConfiguration } from "../src/modules/funding/funding.tokens";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";
import { InMemoryRelease4Repositories } from "./helpers/in-memory-release4-repositories";

const counterpartyAccount = privateKeyToAccount(
  "0x8b3a350cf5c34c9194ca7a545d6a76fc4d6f8d4894d3e9d2046df1d5c8d14d14"
);
const fundingReconciliationConfiguration: FundingReconciliationConfiguration = {
  indexerFreshnessTtlSeconds: 300,
  pendingStaleAfterSeconds: 3600,
  release4CursorKeyOverride: "release4:base-sepolia"
};

function isoFromNow(offsetSeconds: number): string {
  return new Date(Date.now() + offsetSeconds * 1000).toISOString();
}

async function upsertRelease4Cursor(
  release4Repositories: InMemoryRelease4Repositories,
  updatedAt: string
) {
  await release4Repositories.chainCursors.upsert({
    chainId: 84532,
    cursorKey: fundingReconciliationConfiguration.release4CursorKeyOverride ?? "release4:base-sepolia",
    lastProcessedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lastProcessedBlockNumber: "100",
    nextBlockNumber: "101",
    updatedAt
  });
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
    draftsService: new DraftsService(
      release1Repositories,
      release4Repositories,
      authenticatedSessionService,
      fundingReconciliationConfiguration
    ),
    fundingService: new FundingService(
      release1Repositories,
      release4Repositories,
      authenticatedSessionService,
      fundingReconciliationConfiguration
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

async function signCounterpartyChallenge(
  challenge: Awaited<ReturnType<DraftsService["getCounterpartyAcceptance"]>>
): Promise<`0x${string}`> {
  return (
    counterpartyAccount.signTypedData as (input: {
      domain: unknown;
      message: unknown;
      primaryType: unknown;
      types: unknown;
    }) => Promise<`0x${string}`>
  )({
    domain: challenge.challenge.typedData.domain,
    message: challenge.challenge.typedData.message,
    primaryType: challenge.challenge.typedData.primaryType,
    types: challenge.challenge.typedData.types
  });
}

async function createCounterpartyAcceptance(input: Awaited<ReturnType<typeof seedFundingScenario>>) {
  await input.services.draftsService.updateCounterpartyWallet(
    {
      draftDealId: input.draft.draft.id,
      organizationId: "org-1"
    },
    {
      walletAddress: counterpartyAccount.address
    },
    {
      cookieHeader: input.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const challenge = await input.services.draftsService.getCounterpartyAcceptance({
    dealVersionId: input.version.version.id,
    draftDealId: input.draft.draft.id,
    organizationId: "org-1"
  });
  const signature = await signCounterpartyChallenge(challenge);

  await input.services.draftsService.createCounterpartyAcceptance(
    {
      dealVersionId: input.version.version.id,
      draftDealId: input.draft.draft.id,
      organizationId: "org-1"
    },
    { signature }
  );
}

test("funding service returns a ready preparation when projections and both acceptances exist", async () => {
  const { actor, draft, manifest, services, version } = await seedFundingScenario();

  await createCounterpartyAcceptance({ actor, draft, manifest, services, version });

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
    counterpartyAccount.address.toLowerCase()
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
  assert.ok(result.preparation.blockers.includes("COUNTERPARTY_ACCEPTANCE_MISSING"));
  assert.ok(result.preparation.blockers.includes("COUNTERPARTY_WALLET_MISSING"));
  assert.equal(result.preparation.createAgreementTransaction, null);
});

test("funding service reports a counterparty acceptance blocker when the wallet exists but no signature is stored", async () => {
  const seeded = await seedFundingScenario();

  await seeded.services.draftsService.updateCounterpartyWallet(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      walletAddress: counterpartyAccount.address
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const result = await seeded.services.fundingService.getFundingPreparation(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(result.preparation.ready, false);
  assert.ok(result.preparation.blockers.includes("COUNTERPARTY_ACCEPTANCE_MISSING"));
  assert.ok(!result.preparation.blockers.includes("COUNTERPARTY_WALLET_MISSING"));
  assert.equal(
    result.preparation.counterpartyWalletAddress,
    counterpartyAccount.address.toLowerCase()
  );
});

test("funding service records and lists pending funding transactions", async () => {
  const seeded = await seedFundingScenario();

  await createCounterpartyAcceptance(seeded);

  const created = await seeded.services.fundingService.createFundingTransaction(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      transactionHash:
        "0x9999999999999999999999999999999999999999999999999999999999999999"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(created.fundingTransaction.status, "PENDING");
  assert.equal(created.fundingTransaction.submittedByUserId, seeded.actor.userId);
  assert.equal(
    created.fundingTransaction.submittedWalletAddress,
    seeded.actor.walletAddress
  );

  const listed = await seeded.services.fundingService.listFundingTransactions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.fundingTransactions.length, 1);
  assert.equal(listed.fundingTransactions[0]?.status, "PENDING");
  assert.equal(listed.fundingTransactions[0]?.indexedAt, null);
  assert.equal(listed.fundingTransactions[0]?.indexedBlockNumber, null);
  assert.equal(listed.fundingTransactions[0]?.indexedExecutionStatus, null);
  assert.equal(listed.fundingTransactions[0]?.stalePending, null);
  assert.equal(listed.fundingTransactions[0]?.stalePendingAt, null);
  assert.equal(
    listed.fundingTransactions[0]?.stalePendingEvaluation,
    "INDEXER_CURSOR_MISSING"
  );
});

test("funding service marks pending tracked transactions as not stale when the indexer cursor is fresh", async () => {
  const seeded = await seedFundingScenario();

  await seeded.services.release1Repositories.fundingTransactions.create({
    chainId: 84532,
    dealVersionId: seeded.version.version.id,
    draftDealId: seeded.draft.draft.id,
    id: "funding-tx-fresh",
    organizationId: "org-1",
    submittedAt: isoFromNow(-1800),
    submittedByUserId: seeded.actor.userId,
    submittedWalletAddress: seeded.actor.walletAddress,
    submittedWalletId: seeded.actor.walletId,
    supersededAt: null,
    supersededByFundingTransactionId: null,
    transactionHash:
      "0x3131313131313131313131313131313131313131313131313131313131313131"
  });
  await upsertRelease4Cursor(seeded.services.release4Repositories, isoFromNow(-60));

  const listed = await seeded.services.fundingService.listFundingTransactions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.fundingTransactions[0]?.status, "PENDING");
  assert.equal(listed.fundingTransactions[0]?.stalePending, false);
  assert.ok(listed.fundingTransactions[0]?.stalePendingAt);
  assert.equal(listed.fundingTransactions[0]?.stalePendingEvaluation, "READY");
});

test("funding service marks pending tracked transactions as stale when the indexer cursor is fresh and the threshold has passed", async () => {
  const seeded = await seedFundingScenario();

  await seeded.services.release1Repositories.fundingTransactions.create({
    chainId: 84532,
    dealVersionId: seeded.version.version.id,
    draftDealId: seeded.draft.draft.id,
    id: "funding-tx-stale",
    organizationId: "org-1",
    submittedAt: isoFromNow(-3900),
    submittedByUserId: seeded.actor.userId,
    submittedWalletAddress: seeded.actor.walletAddress,
    submittedWalletId: seeded.actor.walletId,
    supersededAt: null,
    supersededByFundingTransactionId: null,
    transactionHash:
      "0x3232323232323232323232323232323232323232323232323232323232323232"
  });
  await upsertRelease4Cursor(seeded.services.release4Repositories, isoFromNow(-60));

  const listed = await seeded.services.fundingService.listFundingTransactions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.fundingTransactions[0]?.status, "PENDING");
  assert.equal(listed.fundingTransactions[0]?.stalePending, true);
  assert.ok(listed.fundingTransactions[0]?.stalePendingAt);
  assert.equal(listed.fundingTransactions[0]?.stalePendingEvaluation, "READY");
});

test("funding service defers stale evaluation when the indexer cursor is stale", async () => {
  const seeded = await seedFundingScenario();

  await seeded.services.release1Repositories.fundingTransactions.create({
    chainId: 84532,
    dealVersionId: seeded.version.version.id,
    draftDealId: seeded.draft.draft.id,
    id: "funding-tx-cursor-stale",
    organizationId: "org-1",
    submittedAt: isoFromNow(-3900),
    submittedByUserId: seeded.actor.userId,
    submittedWalletAddress: seeded.actor.walletAddress,
    submittedWalletId: seeded.actor.walletId,
    supersededAt: null,
    supersededByFundingTransactionId: null,
    transactionHash:
      "0x4141414141414141414141414141414141414141414141414141414141414141"
  });
  await upsertRelease4Cursor(seeded.services.release4Repositories, isoFromNow(-600));

  const listed = await seeded.services.fundingService.listFundingTransactions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.fundingTransactions[0]?.status, "PENDING");
  assert.equal(listed.fundingTransactions[0]?.stalePending, null);
  assert.equal(listed.fundingTransactions[0]?.stalePendingAt, null);
  assert.equal(
    listed.fundingTransactions[0]?.stalePendingEvaluation,
    "INDEXER_CURSOR_STALE"
  );
});

test("funding service supersedes older unresolved tracked transactions when a replacement is submitted", async () => {
  const seeded = await seedFundingScenario();

  await createCounterpartyAcceptance(seeded);

  const first = await seeded.services.fundingService.createFundingTransaction(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      transactionHash:
        "0x6666666666666666666666666666666666666666666666666666666666666666"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const replacement = await seeded.services.fundingService.createFundingTransaction(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      transactionHash:
        "0x7777777777777777777777777777777777777777777777777777777777777777"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(replacement.fundingTransaction.status, "PENDING");
  assert.equal(replacement.fundingTransaction.supersededAt, null);
  assert.equal(replacement.fundingTransaction.supersededByFundingTransactionId, null);

  const listed = await seeded.services.fundingService.listFundingTransactions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.fundingTransactions.length, 2);
  const listedReplacement = listed.fundingTransactions.find(
    (transaction) => transaction.transactionHash === replacement.fundingTransaction.transactionHash
  );
  const listedFirst = listed.fundingTransactions.find(
    (transaction) => transaction.transactionHash === first.fundingTransaction.transactionHash
  );

  assert.equal(listedReplacement?.status, "PENDING");
  assert.equal(listedReplacement?.supersededAt, null);
  assert.equal(listedFirst?.status, "SUPERSEDED");
  assert.ok(listedFirst?.supersededAt);
  assert.equal(listedFirst?.stalePending, false);
  assert.equal(listedFirst?.stalePendingAt, null);
  assert.equal(listedFirst?.stalePendingEvaluation, null);
  assert.equal(
    listedFirst?.supersededByFundingTransactionId,
    replacement.fundingTransaction.id
  );
  assert.equal(
    listedFirst?.supersededByTransactionHash,
    replacement.fundingTransaction.transactionHash
  );
});

test("funding service confirms tracked funding transactions after agreement indexing and activates the draft", async () => {
  const seeded = await seedFundingScenario();

  await createCounterpartyAcceptance(seeded);

  const preparation = await seeded.services.fundingService.getFundingPreparation(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  const trackedTransaction =
    await seeded.services.fundingService.createFundingTransaction(
      {
        dealVersionId: seeded.version.version.id,
        draftDealId: seeded.draft.draft.id,
        organizationId: "org-1"
      },
      {
        transactionHash:
          "0x8888888888888888888888888888888888888888888888888888888888888888"
      },
      {
        cookieHeader: seeded.actor.cookieHeader,
        ipAddress: "127.0.0.1",
        userAgent: "test-agent"
      }
    );

  await seeded.services.release4Repositories.escrowAgreements.upsert({
    agreementAddress: "0x7777777777777777777777777777777777777777",
    arbitratorAddress: null,
    buyerAddress: seeded.actor.walletAddress,
    chainId: 84532,
    createdBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    createdBlockNumber: "10",
    createdLogIndex: 0,
    createdTransactionHash: trackedTransaction.fundingTransaction.transactionHash,
    dealId: buildCanonicalDealId("org-1", seeded.draft.draft.id),
    dealVersionHash: preparation.preparation.dealVersionHash,
    factoryAddress: seeded.manifest.contracts.EscrowFactory!.toLowerCase() as `0x${string}`,
    feeVaultAddress: seeded.manifest.contracts.FeeVault!.toLowerCase() as `0x${string}`,
    initializedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    initializedBlockNumber: "10",
    initializedLogIndex: 1,
    initializedTimestamp: new Date().toISOString(),
    initializedTransactionHash: trackedTransaction.fundingTransaction.transactionHash,
    milestoneCount: 2,
    protocolConfigAddress:
      seeded.manifest.contracts.ProtocolConfig!.toLowerCase() as `0x${string}`,
    protocolFeeBps: seeded.manifest.protocolFeeBps,
    sellerAddress: counterpartyAccount.address.toLowerCase() as `0x${string}`,
    settlementTokenAddress: seeded.manifest.usdcToken!.toLowerCase() as `0x${string}`,
    totalAmount: "3500000",
    updatedAt: new Date().toISOString()
  });

  const listed = await seeded.services.fundingService.listFundingTransactions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.fundingTransactions[0]?.status, "CONFIRMED");
  assert.equal(
    listed.fundingTransactions[0]?.agreementAddress,
    "0x7777777777777777777777777777777777777777"
  );
  assert.equal(listed.fundingTransactions[0]?.matchesTrackedVersion, true);
  assert.equal(listed.fundingTransactions[0]?.indexedAt, null);
  assert.equal(listed.fundingTransactions[0]?.indexedBlockNumber, null);
  assert.equal(listed.fundingTransactions[0]?.indexedExecutionStatus, null);
  assert.equal(listed.fundingTransactions[0]?.stalePending, false);
  assert.equal(listed.fundingTransactions[0]?.stalePendingAt, null);
  assert.equal(listed.fundingTransactions[0]?.stalePendingEvaluation, null);

  const draft = await seeded.services.draftsService.getDraft(
    {
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(draft.draft.state, "ACTIVE");
});

test("funding service marks reverted tracked funding transactions as failed", async () => {
  const seeded = await seedFundingScenario();

  await createCounterpartyAcceptance(seeded);

  const created = await seeded.services.fundingService.createFundingTransaction(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      transactionHash:
        "0x4444444444444444444444444444444444444444444444444444444444444444"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  await seeded.services.release4Repositories.indexedTransactions.upsertMany([
    {
      blockHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      blockNumber: "11",
      chainId: 84532,
      executionStatus: "REVERTED",
      fromAddress: seeded.actor.walletAddress,
      indexedAt: "2026-04-06T12:05:00.000Z",
      toAddress: seeded.manifest.contracts.EscrowFactory!.toLowerCase() as `0x${string}`,
      transactionHash: created.fundingTransaction.transactionHash,
      transactionIndex: 0
    }
  ]);

  const listed = await seeded.services.fundingService.listFundingTransactions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.fundingTransactions[0]?.status, "FAILED");
  assert.equal(listed.fundingTransactions[0]?.agreementAddress, null);
  assert.equal(listed.fundingTransactions[0]?.matchesTrackedVersion, null);
  assert.equal(listed.fundingTransactions[0]?.indexedAt, "2026-04-06T12:05:00.000Z");
  assert.equal(listed.fundingTransactions[0]?.indexedBlockNumber, "11");
  assert.equal(listed.fundingTransactions[0]?.indexedExecutionStatus, "REVERTED");
  assert.equal(listed.fundingTransactions[0]?.stalePending, false);
  assert.equal(listed.fundingTransactions[0]?.stalePendingAt, null);
  assert.equal(listed.fundingTransactions[0]?.stalePendingEvaluation, null);
});

test("funding service marks indexed successful tracked transactions without matching agreements as mismatched", async () => {
  const seeded = await seedFundingScenario();

  await createCounterpartyAcceptance(seeded);

  const created = await seeded.services.fundingService.createFundingTransaction(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      transactionHash:
        "0x5555555555555555555555555555555555555555555555555555555555555555"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  await seeded.services.release4Repositories.indexedTransactions.upsertMany([
    {
      blockHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      blockNumber: "12",
      chainId: 84532,
      executionStatus: "SUCCESS",
      fromAddress: seeded.actor.walletAddress,
      indexedAt: "2026-04-06T12:06:00.000Z",
      toAddress: seeded.manifest.contracts.EscrowFactory!.toLowerCase() as `0x${string}`,
      transactionHash: created.fundingTransaction.transactionHash,
      transactionIndex: 0
    }
  ]);

  const listed = await seeded.services.fundingService.listFundingTransactions(
    {
      dealVersionId: seeded.version.version.id,
      draftDealId: seeded.draft.draft.id,
      organizationId: "org-1"
    },
    {
      cookieHeader: seeded.actor.cookieHeader,
      ipAddress: "127.0.0.1",
      userAgent: "test-agent"
    }
  );

  assert.equal(listed.fundingTransactions[0]?.status, "MISMATCHED");
  assert.equal(listed.fundingTransactions[0]?.agreementAddress, null);
  assert.equal(listed.fundingTransactions[0]?.matchesTrackedVersion, false);
  assert.equal(listed.fundingTransactions[0]?.indexedAt, "2026-04-06T12:06:00.000Z");
  assert.equal(listed.fundingTransactions[0]?.indexedBlockNumber, "12");
  assert.equal(listed.fundingTransactions[0]?.indexedExecutionStatus, "SUCCESS");
  assert.equal(listed.fundingTransactions[0]?.stalePending, false);
  assert.equal(listed.fundingTransactions[0]?.stalePendingAt, null);
  assert.equal(listed.fundingTransactions[0]?.stalePendingEvaluation, null);
});
