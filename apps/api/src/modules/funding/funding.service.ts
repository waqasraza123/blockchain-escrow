import { getContractArtifact, getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";
import type {
  DealVersionFileRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  FileRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import type {
  FundingPreparationBlocker,
  GetFundingPreparationResponse
} from "@blockchain-escrow/shared";
import { fundingPreparationParamsSchema } from "@blockchain-escrow/shared";
import {
  BadRequestException,
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

import { RELEASE1_REPOSITORIES, RELEASE4_REPOSITORIES } from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";
import {
  buildCanonicalDealId,
  buildCanonicalDealVersionHash,
  normalizeApiChainId
} from "../drafts/deal-identity";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function normalizeAddress(value: string): `0x${string}` {
  return getAddress(value).toLowerCase() as `0x${string}`;
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
    @Inject(RELEASE4_REPOSITORIES)
    private readonly release4Repositories: Release4Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService
  ) {}

  async getFundingPreparation(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<GetFundingPreparationResponse> {
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
    const [parties, milestones, fileLinks, acceptances, latestVersion] = await Promise.all([
      this.release1Repositories.dealVersionParties.listByDealVersionId(access.version.id),
      this.release1Repositories.dealVersionMilestones.listByDealVersionId(access.version.id),
      this.release1Repositories.dealVersionFiles.listByDealVersionId(access.version.id),
      this.release1Repositories.dealVersionAcceptances.listByDealVersionId(access.version.id),
      this.release1Repositories.dealVersions.findLatestByDraftDealId(access.draft.id)
    ]);
    const files = await this.resolveFiles(fileLinks);
    const draftParties = await this.release1Repositories.draftDealParties.listByDraftDealId(
      access.draft.id
    );

    const chainId = normalizeApiChainId();
    const manifest = getDeploymentManifestByChainId(chainId);

    if (!manifest) {
      throw new NotFoundException(`deployment manifest not found for chain ${chainId}`);
    }

    const blockers: FundingPreparationBlocker[] = [];
    if (!latestVersion || latestVersion.id !== access.version.id) {
      blockers.push("VERSION_NOT_LATEST");
    }

    const organizationAcceptance = acceptances.find(
      (acceptance) => acceptance.organizationId === access.organization.id
    );
    if (!organizationAcceptance) {
      blockers.push("ORGANIZATION_ACCEPTANCE_MISSING");
    }

    const counterpartyDraftParty = this.requireSingleDraftCounterpartyParty(draftParties);
    const counterpartyVersionParty = this.requireSingleVersionCounterpartyParty(parties);
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
      parties,
      organizationSignerWalletAddress,
      counterpartyWalletAddress
    );

    const dealId = buildCanonicalDealId(access.organization.id, access.draft.id);
    const dealVersionHash = buildCanonicalDealVersionHash(
      access.draft,
      access.version,
      parties,
      milestones,
      files
    );

    const factoryAddress = manifest.contracts.EscrowFactory
      ? normalizeAddress(manifest.contracts.EscrowFactory)
      : null;
    const protocolConfigAddress = manifest.contracts.ProtocolConfig
      ? normalizeAddress(manifest.contracts.ProtocolConfig)
      : null;
    const agreementImplementationAddress = manifest.contracts.EscrowAgreement
      ? normalizeAddress(manifest.contracts.EscrowAgreement)
      : null;
    const settlementTokenAddress = manifest.usdcToken
      ? normalizeAddress(manifest.usdcToken)
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
          chainId,
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

      if (
        settlementTokenAddress &&
        protocolProjection.tokenAllowlistAddress
      ) {
        const allowedTokens =
          await this.release4Repositories.tokenAllowlistEntries.listAllowedByChainIdAndContract(
            chainId,
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

    const linkedAgreement = (
      await this.release4Repositories.escrowAgreements.listByChainId(chainId)
    ).find((agreement) => agreement.dealId === dealId);

    if (linkedAgreement) {
      blockers.push("AGREEMENT_ALREADY_CREATED");

      if (linkedAgreement.dealVersionHash !== dealVersionHash) {
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
                [dealId, dealVersionHash]
              )
            )
          })
        : null;

    const createAgreementTransaction =
      factoryAddress &&
      protocolConfigAddress &&
      settlementTokenAddress &&
      versionPartyAddresses.buyerAddress &&
      versionPartyAddresses.sellerAddress
        ? {
            data: encodeFunctionData({
              abi: getContractArtifact("EscrowFactory").abi as Abi,
              functionName: "createAgreement",
              args: [
                {
                  arbitrator: ZERO_ADDRESS,
                  buyer: versionPartyAddresses.buyerAddress,
                  dealId,
                  dealVersionHash,
                  milestoneCount: milestones.length,
                  seller: versionPartyAddresses.sellerAddress,
                  settlementToken: settlementTokenAddress,
                  totalAmount: BigInt(sumMilestones(milestones))
                }
              ]
            }) as `0x${string}`,
            to: factoryAddress,
            value: "0" as const
          }
        : null;

    return {
      preparation: {
        agreementImplementationAddress,
        arbitratorAddress: ZERO_ADDRESS as `0x${string}`,
        blockers: [...new Set(blockers)],
        buyerAddress: versionPartyAddresses.buyerAddress,
        chainId,
        counterpartyWalletAddress,
        createAgreementTransaction,
        dealId,
        dealVersionHash,
        escrowFactoryAddress: factoryAddress,
        linkedAgreementAddress: linkedAgreement?.agreementAddress ?? null,
        milestoneCount: milestones.length,
        network: manifest.network,
        organizationSignerWalletAddress,
        predictedAgreementAddress: predictedAgreementAddress
          ? normalizeAddress(predictedAgreementAddress)
          : null,
        protocolConfigAddress,
        ready: blockers.length === 0,
        sellerAddress: versionPartyAddresses.sellerAddress,
        settlementTokenAddress,
        totalAmountMinor: sumMilestones(milestones)
      }
    };
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
    requestMetadata: RequestMetadata
  ): Promise<{
    actor: AuthenticatedSessionContext;
    draft: DraftDealRecord;
    membership: OrganizationMemberRecord;
    organization: OrganizationRecord;
    version: DealVersionRecord;
  }> {
    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata
    );
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
