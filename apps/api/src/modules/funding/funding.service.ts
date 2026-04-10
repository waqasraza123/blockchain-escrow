import { randomUUID } from "node:crypto";

import {
  deploymentSupportsCreateAndFund,
  deploymentSupportsMilestoneSettlementExecution,
  getDeploymentManifestByChainId
} from "@blockchain-escrow/contracts-sdk";
import type {
  ChainCursorRecord,
  DealVersionFileRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  EscrowAgreementRecord,
  FileRecord,
  FundingTransactionRecord,
  IndexedTransactionRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  Release12Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import type {
  CreateFundingTransactionResponse,
  FundingPreparationBlocker,
  FundingPreparationSummary,
  FundingTransactionSummary,
  GetFundingPreparationResponse,
  ListFundingTransactionsResponse
} from "@blockchain-escrow/shared";
import {
  createFundingTransactionSchema,
  fundingPreparationParamsSchema
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  getCreate2Address,
  keccak256,
  parseAbiParameters,
  type Abi
} from "viem";

import {
  RELEASE1_REPOSITORIES,
  RELEASE12_REPOSITORIES,
  RELEASE4_REPOSITORIES
} from "../../infrastructure/tokens";
import { ApprovalRuntimeService } from "../approvals/approval-runtime.service";
import { ApprovalsService } from "../approvals/approvals.service";
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";
import {
  FUNDING_RECONCILIATION_CONFIGURATION,
  type FundingReconciliationConfiguration,
  resolveFundingReconciliationCursorKey
} from "./funding.tokens";
import {
  FUNDING_CHAIN_READER,
  type FundingChainReader
} from "./funding-chain-reader";
import {
  buildCanonicalDealId,
  buildCanonicalDealVersionHash,
  normalizeApiChainId
} from "../drafts/deal-identity";
import {
  buildFundingTransactionObservation,
  resolveFundingTransactionStalePendingState,
  resolveFundingTransactionState
} from "./funding-tracking";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const escrowFactoryCreationAbiV1V2 = [
  {
    type: "function",
    name: "createAgreement",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "creation",
        type: "tuple",
        internalType: "struct EscrowFactory.EscrowCreation",
        components: [
          { name: "buyer", type: "address", internalType: "address" },
          { name: "seller", type: "address", internalType: "address" },
          {
            name: "settlementToken",
            type: "address",
            internalType: "address"
          },
          { name: "arbitrator", type: "address", internalType: "address" },
          { name: "dealId", type: "bytes32", internalType: "bytes32" },
          {
            name: "dealVersionHash",
            type: "bytes32",
            internalType: "bytes32"
          },
          { name: "totalAmount", type: "uint256", internalType: "uint256" },
          {
            name: "milestoneCount",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      }
    ],
    outputs: [{ name: "agreementAddress", type: "address", internalType: "address" }]
  },
  {
    type: "function",
    name: "createAndFundAgreement",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "creation",
        type: "tuple",
        internalType: "struct EscrowFactory.EscrowCreation",
        components: [
          { name: "buyer", type: "address", internalType: "address" },
          { name: "seller", type: "address", internalType: "address" },
          {
            name: "settlementToken",
            type: "address",
            internalType: "address"
          },
          { name: "arbitrator", type: "address", internalType: "address" },
          { name: "dealId", type: "bytes32", internalType: "bytes32" },
          {
            name: "dealVersionHash",
            type: "bytes32",
            internalType: "bytes32"
          },
          { name: "totalAmount", type: "uint256", internalType: "uint256" },
          {
            name: "milestoneCount",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      }
    ],
    outputs: [{ name: "agreementAddress", type: "address", internalType: "address" }]
  }
] as const satisfies Abi;

const escrowFactoryCreationAbiV3 = [
  {
    type: "function",
    name: "createAgreement",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "creation",
        type: "tuple",
        internalType: "struct EscrowFactory.EscrowCreation",
        components: [
          { name: "buyer", type: "address", internalType: "address" },
          { name: "seller", type: "address", internalType: "address" },
          {
            name: "settlementToken",
            type: "address",
            internalType: "address"
          },
          { name: "arbitrator", type: "address", internalType: "address" },
          { name: "dealId", type: "bytes32", internalType: "bytes32" },
          {
            name: "dealVersionHash",
            type: "bytes32",
            internalType: "bytes32"
          },
          { name: "totalAmount", type: "uint256", internalType: "uint256" },
          {
            name: "milestoneCount",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "milestoneAmounts",
            type: "uint256[]",
            internalType: "uint256[]"
          }
        ]
      }
    ],
    outputs: [{ name: "agreementAddress", type: "address", internalType: "address" }]
  },
  {
    type: "function",
    name: "createAndFundAgreement",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "creation",
        type: "tuple",
        internalType: "struct EscrowFactory.EscrowCreation",
        components: [
          { name: "buyer", type: "address", internalType: "address" },
          { name: "seller", type: "address", internalType: "address" },
          {
            name: "settlementToken",
            type: "address",
            internalType: "address"
          },
          { name: "arbitrator", type: "address", internalType: "address" },
          { name: "dealId", type: "bytes32", internalType: "bytes32" },
          {
            name: "dealVersionHash",
            type: "bytes32",
            internalType: "bytes32"
          },
          { name: "totalAmount", type: "uint256", internalType: "uint256" },
          {
            name: "milestoneCount",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "milestoneAmounts",
            type: "uint256[]",
            internalType: "uint256[]"
          }
        ]
      }
    ],
    outputs: [{ name: "agreementAddress", type: "address", internalType: "address" }]
  }
] as const satisfies Abi;

interface FundingAccessContext {
  actor: AuthenticatedSessionContext;
  draft: DraftDealRecord;
  membership: OrganizationMemberRecord;
  organization: OrganizationRecord;
  version: DealVersionRecord;
}

type FundingOrganizationAccess = Pick<
  FundingAccessContext,
  "actor" | "membership" | "organization"
>;

interface FundingComputationContext extends FundingAccessContext {
  acceptances: Awaited<
    ReturnType<Release1Repositories["dealVersionAcceptances"]["listByDealVersionId"]>
  >;
  agreements: EscrowAgreementRecord[];
  agreementsByObservedTransactionHash: ReadonlyMap<`0x${string}`, EscrowAgreementRecord>;
  chainId: number;
  dealId: `0x${string}`;
  dealVersionHash: `0x${string}`;
  draftParties: DraftDealPartyRecord[];
  files: FileRecord[];
  fundingTransactionsById: ReadonlyMap<string, FundingTransactionRecord>;
  indexedTransactionsByHash: ReadonlyMap<`0x${string}`, IndexedTransactionRecord>;
  latestVersion: DealVersionRecord | null;
  linkedAgreement: EscrowAgreementRecord | null;
  manifest: NonNullable<ReturnType<typeof getDeploymentManifestByChainId>>;
  milestones: DealVersionMilestoneRecord[];
  parties: DealVersionPartyRecord[];
  release4ChainCursor: ChainCursorRecord | null;
  staleEvaluatedAt: string;
}

function normalizeAddress(value: string): `0x${string}` {
  return getAddress(value).toLowerCase() as `0x${string}`;
}

function buildEscrowFactoryCreationTransactionData(input: {
  buyerAddress: `0x${string}`;
  dealId: `0x${string}`;
  dealVersionHash: `0x${string}`;
  milestoneAmountsMinor: readonly string[];
  sellerAddress: `0x${string}`;
  settlementTokenAddress: `0x${string}`;
  supportsCreateAndFund: boolean;
  supportsMilestoneSettlementExecution: boolean;
  totalAmountMinor: string;
}): `0x${string}` {
  const functionName = input.supportsCreateAndFund
    ? "createAndFundAgreement"
    : "createAgreement";
  const commonArgs = {
    arbitrator: ZERO_ADDRESS as `0x${string}`,
    buyer: input.buyerAddress,
    dealId: input.dealId,
    dealVersionHash: input.dealVersionHash,
    milestoneCount: input.milestoneAmountsMinor.length,
    seller: input.sellerAddress,
    settlementToken: input.settlementTokenAddress,
    totalAmount: BigInt(input.totalAmountMinor)
  };

  if (input.supportsMilestoneSettlementExecution) {
    return encodeFunctionData({
      abi: escrowFactoryCreationAbiV3,
      functionName,
      args: [
        {
          ...commonArgs,
          milestoneAmounts: input.milestoneAmountsMinor.map((amount) => BigInt(amount))
        }
      ]
    }) as `0x${string}`;
  }

  return encodeFunctionData({
    abi: escrowFactoryCreationAbiV1V2,
    functionName,
    args: [commonArgs]
  }) as `0x${string}`;
}

function cloneCreationCode(implementation: `0x${string}`): `0x${string}` {
  return `0x3d602d80600a3d3981f3363d3d373d3d3d363d73${implementation.slice(2)}5af43d82803e903d91602b57fd5bf3`;
}

function sumMilestones(milestones: readonly DealVersionMilestoneRecord[]): string {
  return milestones
    .reduce((total, milestone) => total + BigInt(milestone.amountMinor), 0n)
    .toString();
}

@Injectable()
export class FundingService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly release1Repositories: Release1Repositories,
    @Inject(RELEASE12_REPOSITORIES)
    private readonly release12Repositories: Release12Repositories,
    @Inject(RELEASE4_REPOSITORIES)
    private readonly release4Repositories: Release4Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService,
    @Inject(FUNDING_RECONCILIATION_CONFIGURATION)
    private readonly fundingReconciliationConfiguration: FundingReconciliationConfiguration,
    @Inject(FUNDING_CHAIN_READER)
    private readonly fundingChainReader: FundingChainReader,
    private readonly approvalsService: ApprovalsService,
    private readonly approvalRuntimeService: ApprovalRuntimeService
  ) {}

  async getFundingPreparation(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<GetFundingPreparationResponse> {
    const parsed = fundingPreparationParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const authorized = await this.authorizeOrganizationActor(
      actor,
      parsed.data.organizationId
    );
    return this.getFundingPreparationWithActor(authorized, parsed.data);
  }

  async getFundingPreparationWithActor(
    authorized: FundingOrganizationAccess,
    input: {
      dealVersionId: string;
      draftDealId: string;
      organizationId: string;
    }
  ): Promise<GetFundingPreparationResponse> {
    const access = await this.requireDealVersionAccessForActor(
      authorized,
      input.organizationId,
      input.draftDealId,
      input.dealVersionId
    );
    const context = await this.buildFundingContext(access, new Date().toISOString());

    return {
      preparation: await this.buildFundingPreparationSummary(context)
    };
  }

  async getFundingPreparationForActor(input: {
    dealVersionId: string;
    draftDealId: string;
    organizationId: string;
  }): Promise<GetFundingPreparationResponse> {
    const organization =
      await this.release1Repositories.organizations.findById(input.organizationId);

    if (!organization) {
      throw new NotFoundException("organization not found");
    }

    const wallets = await this.release1Repositories.wallets.listByUserId(
      organization.createdByUserId
    );
    const wallet = wallets[0];

    if (!wallet) {
      throw new ConflictException("organization synthetic actor wallet is missing");
    }

    const membership =
      await this.release1Repositories.organizationMembers.findMembership(
        organization.id,
        organization.createdByUserId
      );

    if (!membership) {
      throw new ConflictException("organization synthetic actor membership is missing");
    }

    const actor = await this.authenticatedSessionService.loadSyntheticContext({
      userId: organization.createdByUserId,
      walletId: wallet.id
    });

    return this.getFundingPreparationWithActor(
      {
        actor,
        membership,
        organization
      },
      input
    );
  }

  async createFundingTransaction(
    fundingInput: unknown,
    transactionInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateFundingTransactionResponse> {
    const parsedFunding = fundingPreparationParamsSchema.safeParse(fundingInput);

    if (!parsedFunding.success) {
      throw new BadRequestException(parsedFunding.error.flatten());
    }

    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const authorized = await this.authorizeOrganizationActor(
      actor,
      parsedFunding.data.organizationId,
      "ADMIN"
    );

    return this.createFundingTransactionWithActor(
      authorized,
      parsedFunding.data,
      transactionInput,
      requestMetadata
    );
  }

  async createFundingTransactionWithActor(
    authorized: FundingOrganizationAccess,
    fundingInput: {
      dealVersionId: string;
      draftDealId: string;
      organizationId: string;
    },
    transactionInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateFundingTransactionResponse> {
    const parsedFunding = fundingPreparationParamsSchema.safeParse(fundingInput);
    const parsedTransaction = createFundingTransactionSchema.safeParse(transactionInput);

    if (!parsedFunding.success) {
      throw new BadRequestException(parsedFunding.error.flatten());
    }

    if (!parsedTransaction.success) {
      throw new BadRequestException(parsedTransaction.error.flatten());
    }

    const access = await this.requireDealVersionAccessForActor(
      authorized,
      parsedFunding.data.organizationId,
      parsedFunding.data.draftDealId,
      parsedFunding.data.dealVersionId
    );
    const now = new Date().toISOString();
    const context = await this.buildFundingContext(access, now);
    const preparation = await this.buildFundingPreparationSummary(context);
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "FUNDING_TRANSACTION_CREATE",
      costCenterId: access.draft.costCenterId ?? null,
      dealVersionId: access.version.id,
      dealVersionMilestoneId: null,
      draftDealId: access.draft.id,
      input: null,
      organizationId: access.organization.id,
      settlementCurrency: access.version.settlementCurrency,
      subjectId: access.version.id,
      subjectLabel: access.version.title,
      subjectMetadata: {
        versionNumber: access.version.versionNumber
      },
      subjectSnapshot: {
        costCenterId: access.draft.costCenterId ?? null,
        settlementCurrency: access.version.settlementCurrency,
        versionId: access.version.id,
        versionNumber: access.version.versionNumber
      },
      subjectType: "DEAL_VERSION",
      title: access.version.title,
      totalAmountMinor: sumMilestones(context.milestones)
    });

    if (context.linkedAgreement) {
      throw new ConflictException("agreement already created for draft deal");
    }

    if (!preparation.ready) {
      throw new ConflictException("funding preparation is not ready");
    }

    const transactionHash =
      parsedTransaction.data.transactionHash.toLowerCase() as `0x${string}`;
    const existing =
      await this.release1Repositories.fundingTransactions.findByChainIdAndTransactionHash(
        context.chainId,
        transactionHash
      );

    if (existing) {
      throw new ConflictException("funding transaction is already tracked");
    }

    const fundingTransaction = await this.release1Repositories.fundingTransactions.create({
      chainId: context.chainId,
      dealVersionId: access.version.id,
      draftDealId: access.draft.id,
      id: randomUUID(),
      organizationId: access.organization.id,
      reconciledAgreementAddress: null,
      reconciledAt: null,
      reconciledConfirmedAt: null,
      reconciledMatchesTrackedVersion: null,
      reconciledStatus: null,
      stalePendingEscalatedAt: null,
      submittedAt: now,
      submittedByUserId: access.actor.user.id,
      submittedWalletAddress: access.actor.wallet.address,
      submittedWalletId: access.actor.wallet.id,
      supersededAt: null,
      supersededByFundingTransactionId: null,
      transactionHash
    });
    await this.markSponsoredFundingRequestSubmitted({
      dealVersionId: access.version.id,
      transactionHash,
      walletId: access.actor.wallet.id
    });
    const supersededTransactions = await this.supersedePendingFundingTransactions(
      context,
      fundingTransaction,
      requestMetadata,
      now
    );

    await this.release1Repositories.auditLogs.append({
      action: "FUNDING_TRANSACTION_SUBMITTED",
      actorUserId: access.actor.user.id,
      entityId: fundingTransaction.id,
      entityType: "FUNDING_TRANSACTION",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        chainId: fundingTransaction.chainId,
        dealVersionId: fundingTransaction.dealVersionId,
        draftDealId: fundingTransaction.draftDealId,
        transactionHash: fundingTransaction.transactionHash
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    return {
      fundingTransaction: this.buildFundingTransactionSummary(fundingTransaction, {
        ...context,
        fundingTransactionsById: new Map([
          ...context.fundingTransactionsById,
          [fundingTransaction.id, fundingTransaction],
          ...supersededTransactions.map((transaction) => [transaction.id, transaction] as const)
        ])
      })
    };
  }

  private async markSponsoredFundingRequestSubmitted(input: {
    dealVersionId: string;
    transactionHash: `0x${string}`;
    walletId: string;
  }): Promise<void> {
    const sponsoredRequest =
      await this.release12Repositories.sponsoredTransactionRequests.findLatestApprovedBySubjectAndWallet(
        {
          kind: "FUNDING_TRANSACTION_CREATE",
          subjectId: input.dealVersionId,
          walletId: input.walletId
        }
      );

    if (!sponsoredRequest) {
      return;
    }

    await this.release12Repositories.sponsoredTransactionRequests.update(sponsoredRequest.id, {
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
      submittedTransactionHash: input.transactionHash,
      updatedAt: new Date().toISOString()
    });
  }

  async listFundingTransactions(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListFundingTransactionsResponse> {
    const parsed = fundingPreparationParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireDealVersionAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );
    const context = await this.buildFundingContext(access, new Date().toISOString());

    const fundingTransactions =
      await this.release1Repositories.fundingTransactions.listByDealVersionId(
        access.version.id
      );

    return {
      fundingTransactions: fundingTransactions.map((record) =>
        this.buildFundingTransactionSummary(record, context)
      )
    };
  }

  private async buildFundingContext(
    access: FundingAccessContext,
    staleEvaluatedAt: string
  ): Promise<FundingComputationContext> {
    const [parties, milestones, fileLinks, acceptances, latestVersion, draftParties] =
      await Promise.all([
        this.release1Repositories.dealVersionParties.listByDealVersionId(access.version.id),
        this.release1Repositories.dealVersionMilestones.listByDealVersionId(access.version.id),
        this.release1Repositories.dealVersionFiles.listByDealVersionId(access.version.id),
        this.release1Repositories.dealVersionAcceptances.listByDealVersionId(access.version.id),
        this.release1Repositories.dealVersions.findLatestByDraftDealId(access.draft.id),
        this.release1Repositories.draftDealParties.listByDraftDealId(access.draft.id)
      ]);
    const files = await this.resolveFiles(fileLinks);
    const chainId = normalizeApiChainId();
    const manifest = getDeploymentManifestByChainId(chainId);

    if (!manifest) {
      throw new NotFoundException(`deployment manifest not found for chain ${chainId}`);
    }

    const dealId = buildCanonicalDealId(access.organization.id, access.draft.id);
    const dealVersionHash = buildCanonicalDealVersionHash(
      access.draft,
      access.version,
      parties,
      milestones,
      files
    );
    const release4CursorKey = resolveFundingReconciliationCursorKey(
      this.fundingReconciliationConfiguration,
      chainId
    );
    const [agreements, fundingTransactions, indexedTransactions] = await Promise.all([
      this.release4Repositories.escrowAgreements.listByChainId(chainId),
      this.release1Repositories.fundingTransactions.listByDealVersionId(access.version.id),
      this.release4Repositories.indexedTransactions.listByChainId(chainId)
    ]);
    const release4ChainCursor = release4CursorKey
      ? await this.release4Repositories.chainCursors.findByChainIdAndCursorKey(
          chainId,
          release4CursorKey
        )
      : null;
    const linkedAgreement = agreements.find((agreement) => agreement.dealId === dealId) ?? null;

    return {
      ...access,
      acceptances,
      agreements,
      agreementsByObservedTransactionHash: new Map(
        agreements.flatMap((agreement) => {
          const entries: [`0x${string}`, EscrowAgreementRecord][] = [
            [agreement.createdTransactionHash, agreement]
          ];

          if (agreement.fundedTransactionHash) {
            entries.push([agreement.fundedTransactionHash, agreement]);
          }

          return entries;
        })
      ),
      chainId,
      dealId,
      dealVersionHash,
      draftParties,
      files,
      fundingTransactionsById: new Map(
        fundingTransactions.map((transaction) => [transaction.id, transaction] as const)
      ),
      indexedTransactionsByHash: new Map(
        indexedTransactions.map((transaction) => [
          transaction.transactionHash,
          transaction
        ] as const)
      ),
      latestVersion,
      linkedAgreement,
      manifest,
      milestones,
      parties,
      release4ChainCursor,
      staleEvaluatedAt
    };
  }

  private async buildFundingPreparationSummary(
    context: FundingComputationContext
  ): Promise<FundingPreparationSummary> {
    const blockers: FundingPreparationBlocker[] = [];
    const approval = await this.approvalsService.buildApprovalRequirement(
      context.draft,
      context.version
    );
    const supportsCreateAndFund = deploymentSupportsCreateAndFund(context.manifest);
    const supportsMilestoneSettlement =
      deploymentSupportsMilestoneSettlementExecution(context.manifest);
    const totalAmountMinor = sumMilestones(context.milestones);

    if (!context.latestVersion || context.latestVersion.id !== context.version.id) {
      blockers.push("VERSION_NOT_LATEST");
    }

    if (approval.required) {
      if (!approval.currentRequest) {
        blockers.push("APPROVAL_REQUEST_MISSING");
      } else if (approval.currentRequest.status === "PENDING") {
        blockers.push("APPROVAL_REQUEST_PENDING");
      } else if (approval.currentRequest.status === "REJECTED") {
        blockers.push("APPROVAL_REQUEST_REJECTED");
      }
    }

    const organizationAcceptance = context.acceptances.find(
      (acceptance) => acceptance.organizationId === context.organization.id
    );

    if (!organizationAcceptance) {
      blockers.push("ORGANIZATION_ACCEPTANCE_MISSING");
    }

    const counterpartyDraftParty = this.requireSingleDraftCounterpartyParty(
      context.draftParties
    );
    const counterpartyVersionParty = this.requireSingleVersionCounterpartyParty(
      context.parties
    );
    const counterpartyWalletAddress = counterpartyDraftParty.walletAddress
      ? normalizeAddress(counterpartyDraftParty.walletAddress)
      : null;

    if (!counterpartyWalletAddress) {
      blockers.push("COUNTERPARTY_WALLET_MISSING");
    }

    const organizationSignerWalletAddress = organizationAcceptance
      ? normalizeAddress(organizationAcceptance.signerWalletAddress)
      : null;
    const counterpartyAcceptance =
      await this.release1Repositories.counterpartyDealVersionAcceptances.findByDealVersionPartyId(
        counterpartyVersionParty.id
      );

    if (!counterpartyAcceptance) {
      blockers.push("COUNTERPARTY_ACCEPTANCE_MISSING");
    }

    const versionPartyAddresses = this.resolveBuyerAndSellerAddresses(
      context.parties,
      organizationSignerWalletAddress,
      counterpartyWalletAddress
    );

    const factoryAddress = context.manifest.contracts.EscrowFactory
      ? normalizeAddress(context.manifest.contracts.EscrowFactory)
      : null;
    const protocolConfigAddress = context.manifest.contracts.ProtocolConfig
      ? normalizeAddress(context.manifest.contracts.ProtocolConfig)
      : null;
    const agreementImplementationAddress = context.manifest.contracts.EscrowAgreement
      ? normalizeAddress(context.manifest.contracts.EscrowAgreement)
      : null;
    const settlementTokenAddress = context.manifest.usdcToken
      ? normalizeAddress(context.manifest.usdcToken)
      : null;

    if (!factoryAddress) {
      blockers.push("ESCROW_FACTORY_NOT_DEPLOYED");
    }
    if (!protocolConfigAddress) {
      blockers.push("PROTOCOL_CONFIG_NOT_DEPLOYED");
    }
    if (!agreementImplementationAddress) {
      blockers.push("ESCROW_AGREEMENT_IMPLEMENTATION_NOT_DEPLOYED");
    }
    if (!settlementTokenAddress) {
      blockers.push("USDC_TOKEN_NOT_CONFIGURED");
    }

    const protocolProjection = protocolConfigAddress
      ? await this.release4Repositories.protocolConfigStates.findByChainIdAndAddress(
          context.chainId,
          protocolConfigAddress
        )
      : null;

    if (!protocolProjection) {
      blockers.push("PROTOCOL_CONFIG_PROJECTION_MISSING");
    } else {
      if (!protocolProjection.arbitratorRegistryAddress) {
        blockers.push("ARBITRATOR_REGISTRY_NOT_CONFIGURED");
      }
      if (!protocolProjection.feeVaultAddress) {
        blockers.push("FEE_VAULT_NOT_CONFIGURED");
      }
      if (!protocolProjection.tokenAllowlistAddress) {
        blockers.push("TOKEN_ALLOWLIST_NOT_CONFIGURED");
      }
      if (protocolProjection.createEscrowPaused) {
        blockers.push("CREATE_ESCROW_PAUSED");
      }
      if (protocolProjection.fundingPaused) {
        blockers.push("FUNDING_PAUSED");
      }

      if (settlementTokenAddress && protocolProjection.tokenAllowlistAddress) {
        const allowedTokens =
          await this.release4Repositories.tokenAllowlistEntries.listAllowedByChainIdAndContract(
            context.chainId,
            protocolProjection.tokenAllowlistAddress
          );
        const isAllowed = allowedTokens.some(
          (entry) => entry.token === settlementTokenAddress && entry.isAllowed
        );

        if (!isAllowed) {
          blockers.push("SETTLEMENT_TOKEN_NOT_ALLOWED");
        }
      }
    }

    if (context.linkedAgreement) {
      blockers.push("AGREEMENT_ALREADY_CREATED");

      if (context.linkedAgreement.dealVersionHash !== context.dealVersionHash) {
        blockers.push("DEAL_VERSION_MISMATCH_WITH_EXISTING_AGREEMENT");
      }
    }

    const predictedAgreementAddress =
      factoryAddress && agreementImplementationAddress
        ? getCreate2Address({
            bytecodeHash: keccak256(cloneCreationCode(agreementImplementationAddress)),
            from: factoryAddress,
            salt: keccak256(
              encodeAbiParameters(
                parseAbiParameters("bytes32 dealId, bytes32 dealVersionHash"),
                [context.dealId, context.dealVersionHash]
              )
            )
          })
        : null;

    let buyerAllowanceMinor: string | null = null;
    let requiredBuyerAllowanceMinor: string | null = null;
    const allowanceTargetAddress =
      supportsCreateAndFund && predictedAgreementAddress
        ? normalizeAddress(predictedAgreementAddress)
        : null;

    if (
      supportsCreateAndFund &&
      settlementTokenAddress &&
      versionPartyAddresses.buyerAddress &&
      allowanceTargetAddress
    ) {
      requiredBuyerAllowanceMinor = totalAmountMinor;

      const allowanceResult = await this.fundingChainReader.readErc20Allowance({
        chainId: context.chainId,
        ownerAddress: versionPartyAddresses.buyerAddress,
        spenderAddress: allowanceTargetAddress,
        tokenAddress: settlementTokenAddress
      });

      if (allowanceResult.status === "AVAILABLE") {
        buyerAllowanceMinor = allowanceResult.allowance.toString();

        if (allowanceResult.allowance < BigInt(totalAmountMinor)) {
          blockers.push("BUYER_ALLOWANCE_INSUFFICIENT");
        }
      } else {
        blockers.push("BUYER_ALLOWANCE_UNAVAILABLE");
      }
    }

    const createAgreementTransaction =
      factoryAddress &&
      protocolConfigAddress &&
      settlementTokenAddress &&
      versionPartyAddresses.buyerAddress &&
      versionPartyAddresses.sellerAddress
        ? {
            data: buildEscrowFactoryCreationTransactionData({
              buyerAddress: versionPartyAddresses.buyerAddress,
              dealId: context.dealId,
              dealVersionHash: context.dealVersionHash,
              milestoneAmountsMinor: context.milestones.map(
                (milestone) => milestone.amountMinor
              ),
              sellerAddress: versionPartyAddresses.sellerAddress,
              settlementTokenAddress,
              supportsCreateAndFund,
              supportsMilestoneSettlementExecution: supportsMilestoneSettlement,
              totalAmountMinor
            }),
            to: factoryAddress,
            value: "0" as const
          }
        : null;

    return {
      agreementImplementationAddress,
      allowanceTargetAddress,
      approval,
      arbitratorAddress: ZERO_ADDRESS as `0x${string}`,
      blockers: [...new Set(blockers)],
      buyerAllowanceMinor,
      buyerAddress: versionPartyAddresses.buyerAddress,
      chainId: context.chainId,
      counterpartyWalletAddress,
      createAgreementFunctionName: createAgreementTransaction
        ? supportsCreateAndFund
          ? "createAndFundAgreement"
          : "createAgreement"
        : null,
      createAgreementTransaction,
      dealId: context.dealId,
      dealVersionHash: context.dealVersionHash,
      escrowFactoryAddress: factoryAddress,
      linkedAgreementAddress: context.linkedAgreement?.agreementAddress ?? null,
      milestoneCount: context.milestones.length,
      network: context.manifest.network,
      organizationSignerWalletAddress,
      predictedAgreementAddress: predictedAgreementAddress
        ? normalizeAddress(predictedAgreementAddress)
        : null,
      protocolConfigAddress,
      ready: blockers.length === 0,
      requiredBuyerAllowanceMinor,
      sellerAddress: versionPartyAddresses.sellerAddress,
      settlementTokenAddress,
      totalAmountMinor
    };
  }

  private buildFundingTransactionSummary(
    record: FundingTransactionRecord,
    context: FundingComputationContext
  ): FundingTransactionSummary {
    const indexedTransaction =
      context.indexedTransactionsByHash.get(record.transactionHash) ?? null;
    const resolvedState = resolveFundingTransactionState({
      dealId: context.dealId,
      dealVersionHash: context.dealVersionHash,
      fundingTransaction: record,
      indexedTransaction,
      observedAgreement:
        context.agreementsByObservedTransactionHash.get(record.transactionHash) ?? null,
      requiresFundedAgreement: deploymentSupportsCreateAndFund(context.manifest)
    });
    const observation = buildFundingTransactionObservation(indexedTransaction);
    const stalePendingState = resolveFundingTransactionStalePendingState({
      currentStatus: resolvedState.status,
      evaluatedAt: context.staleEvaluatedAt,
      fundingTransaction: record,
      indexerFreshnessTtlSeconds:
        this.fundingReconciliationConfiguration.indexerFreshnessTtlSeconds,
      pendingStaleAfterSeconds:
        this.fundingReconciliationConfiguration.pendingStaleAfterSeconds,
      release4ChainCursor: context.release4ChainCursor
    });
    const supersededByTransaction =
      record.supersededByFundingTransactionId
        ? context.fundingTransactionsById.get(record.supersededByFundingTransactionId) ?? null
        : null;

    return {
      agreementAddress: resolvedState.agreementAddress,
      chainId: record.chainId,
      confirmedAt: resolvedState.confirmedAt,
      dealVersionId: record.dealVersionId,
      draftDealId: record.draftDealId,
      id: record.id,
      indexedAt: observation.indexedAt,
      indexedBlockNumber: observation.indexedBlockNumber,
      indexedExecutionStatus: observation.indexedExecutionStatus,
      matchesTrackedVersion: resolvedState.matchesTrackedVersion,
      organizationId: record.organizationId,
      reconciledAt: record.reconciledAt,
      reconciledStatus: record.reconciledStatus,
      stalePending: stalePendingState.stalePending,
      stalePendingAt: stalePendingState.stalePendingAt,
      stalePendingEscalatedAt: record.stalePendingEscalatedAt,
      stalePendingEvaluation: stalePendingState.stalePendingEvaluation,
      status: resolvedState.status,
      submittedAt: record.submittedAt,
      submittedByUserId: record.submittedByUserId,
      submittedWalletAddress: record.submittedWalletAddress,
      supersededAt: record.supersededAt,
      supersededByFundingTransactionId: record.supersededByFundingTransactionId,
      supersededByTransactionHash: supersededByTransaction?.transactionHash ?? null,
      transactionHash: record.transactionHash
    };
  }

  private async supersedePendingFundingTransactions(
    context: FundingComputationContext,
    replacementTransaction: FundingTransactionRecord,
    requestMetadata: RequestMetadata,
    occurredAt: string
  ): Promise<FundingTransactionRecord[]> {
    const supersededTransactions: FundingTransactionRecord[] = [];

    for (const trackedTransaction of context.fundingTransactionsById.values()) {
      const status = resolveFundingTransactionState({
        dealId: context.dealId,
        dealVersionHash: context.dealVersionHash,
        fundingTransaction: trackedTransaction,
        indexedTransaction:
          context.indexedTransactionsByHash.get(trackedTransaction.transactionHash) ?? null,
        observedAgreement:
          context.agreementsByObservedTransactionHash.get(
            trackedTransaction.transactionHash
          ) ?? null,
        requiresFundedAgreement: deploymentSupportsCreateAndFund(context.manifest)
      }).status;

      if (status !== "PENDING") {
        continue;
      }

      const supersededTransaction =
        await this.release1Repositories.fundingTransactions.markSuperseded(
          trackedTransaction.id,
          replacementTransaction.id,
          occurredAt
        );
      supersededTransactions.push(supersededTransaction);

      await this.release1Repositories.auditLogs.append({
        action: "FUNDING_TRANSACTION_SUPERSEDED",
        actorUserId: context.actor.user.id,
        entityId: supersededTransaction.id,
        entityType: "FUNDING_TRANSACTION",
        id: randomUUID(),
        ipAddress: requestMetadata.ipAddress,
        metadata: {
          supersededAt: occurredAt,
          supersededByFundingTransactionId: replacementTransaction.id,
          supersededByTransactionHash: replacementTransaction.transactionHash
        },
        occurredAt,
        organizationId: context.organization.id,
        userAgent: requestMetadata.userAgent
      });
    }

    return supersededTransactions;
  }
  private requireSingleDraftCounterpartyParty(
    parties: readonly DraftDealPartyRecord[]
  ): DraftDealPartyRecord {
    const counterpartyParties = parties.filter(
      (party) => party.subjectType === "COUNTERPARTY"
    );

    if (counterpartyParties.length !== 1) {
      throw new NotFoundException("draft counterparty party not found");
    }

    return counterpartyParties[0] as DraftDealPartyRecord;
  }

  private requireSingleVersionCounterpartyParty(
    parties: readonly DealVersionPartyRecord[]
  ): DealVersionPartyRecord {
    const counterpartyParties = parties.filter(
      (party) => party.subjectType === "COUNTERPARTY"
    );

    if (counterpartyParties.length !== 1) {
      throw new NotFoundException("deal version counterparty party not found");
    }

    return counterpartyParties[0] as DealVersionPartyRecord;
  }

  private resolveBuyerAndSellerAddresses(
    parties: readonly DealVersionPartyRecord[],
    organizationSignerWalletAddress: `0x${string}` | null,
    counterpartyWalletAddress: `0x${string}` | null
  ): {
    buyerAddress: `0x${string}` | null;
    sellerAddress: `0x${string}` | null;
  } {
    let buyerAddress: `0x${string}` | null = null;
    let sellerAddress: `0x${string}` | null = null;

    for (const party of parties) {
      const resolvedWallet =
        party.subjectType === "ORGANIZATION"
          ? organizationSignerWalletAddress
          : counterpartyWalletAddress;

      if (party.role === "BUYER") {
        buyerAddress = resolvedWallet;
      }

      if (party.role === "SELLER") {
        sellerAddress = resolvedWallet;
      }
    }

    return { buyerAddress, sellerAddress };
  }

  private async resolveFiles(
    fileLinks: readonly DealVersionFileRecord[]
  ): Promise<FileRecord[]> {
    const files = await Promise.all(
      fileLinks.map((link) => this.release1Repositories.files.findById(link.fileId))
    );

    return files.map((file) => {
      if (!file) {
        throw new NotFoundException("linked file not found");
      }

      return file;
    });
  }

  private async requireDealVersionAccess(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    requestMetadata: RequestMetadata,
    minimumRole?: "OWNER" | "ADMIN" | "MEMBER"
  ): Promise<FundingAccessContext> {
    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const authorized = await this.authorizeOrganizationActor(
      actor,
      organizationId,
      minimumRole
    );
    return this.requireDealVersionAccessForActor(
      authorized,
      organizationId,
      draftDealId,
      dealVersionId
    );
  }

  async requireDealVersionAccessForActor(
    authorized: FundingOrganizationAccess,
    organizationId: string,
    draftDealId: string,
    dealVersionId: string
  ): Promise<FundingAccessContext> {
    const [draft, version] = await Promise.all([
      this.release1Repositories.draftDeals.findById(draftDealId),
      this.release1Repositories.dealVersions.findById(dealVersionId)
    ]);

    if (!draft || draft.organizationId !== organizationId) {
      throw new NotFoundException("draft deal not found");
    }

    if (
      !version ||
      version.organizationId !== organizationId ||
      version.draftDealId !== draft.id
    ) {
      throw new NotFoundException("deal version not found");
    }

    return {
      actor: authorized.actor,
      draft,
      membership: authorized.membership,
      organization: authorized.organization,
      version
    };
  }

  private async requireOrganizationAccess(
    organizationId: string,
    requestMetadata: RequestMetadata,
    minimumRole?: "OWNER" | "ADMIN" | "MEMBER"
  ): Promise<{
    actor: AuthenticatedSessionContext;
    membership: OrganizationMemberRecord;
    organization: OrganizationRecord;
  }> {
    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    return this.authorizeOrganizationActor(actor, organizationId, minimumRole);
  }

  async authorizeOrganizationActor(
    actor: AuthenticatedSessionContext,
    organizationId: string,
    minimumRole?: "OWNER" | "ADMIN" | "MEMBER"
  ): Promise<{
    actor: AuthenticatedSessionContext;
    membership: OrganizationMemberRecord;
    organization: OrganizationRecord;
  }> {
    const [organization, membership] = await Promise.all([
      this.release1Repositories.organizations.findById(organizationId),
      this.release1Repositories.organizationMembers.findMembership(
        organizationId,
        actor.user.id
      )
    ]);

    if (!organization) {
      throw new NotFoundException("organization not found");
    }

    if (!membership) {
      throw new ForbiddenException("organization access is required");
    }

    if (minimumRole && !hasMinimumOrganizationRole(membership.role, minimumRole)) {
      throw new ForbiddenException("organization role is insufficient");
    }

    return {
      actor,
      membership,
      organization
    };
  }
}
