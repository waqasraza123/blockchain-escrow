import type {
  GasPolicyRecord,
  Release12Repositories,
  SponsoredTransactionRequestRecord
} from "@blockchain-escrow/db";

type SponsoredRequestStore = Map<string, SponsoredTransactionRequestRecord>;
type GasPolicyStore = Map<string, GasPolicyRecord>;

export function createRelease12RepositoriesStub() {
  const sponsoredRequestStore: SponsoredRequestStore = new Map();
  const gasPolicyStore: GasPolicyStore = new Map();

  const release12Repositories = {
    gasPolicies: {
      create: async (record: GasPolicyRecord) => {
        gasPolicyStore.set(record.id, record);
        return record;
      },
      findById: async (id: string) => gasPolicyStore.get(id) ?? null,
      listActiveByOrganizationId: async (organizationId: string) =>
        [...gasPolicyStore.values()].filter(
          (record) => record.organizationId === organizationId && record.active
        ),
      listByOrganizationId: async (organizationId: string) =>
        [...gasPolicyStore.values()].filter(
          (record) => record.organizationId === organizationId
        ),
      update: async (
        id: string,
        updates: Partial<
          Omit<GasPolicyRecord, "id" | "organizationId" | "createdAt" | "createdByUserId">
        >
      ) => {
        const existing = gasPolicyStore.get(id);

        if (!existing) {
          throw new Error(`missing gas policy ${id}`);
        }

        const next = { ...existing, ...updates };
        gasPolicyStore.set(id, next);
        return next;
      }
    },
    sponsoredTransactionRequests: {
      countApprovedCreatedSince: async () =>
        [...sponsoredRequestStore.values()].filter((record) => record.approvedAt !== null).length,
      create: async (record: SponsoredTransactionRequestRecord) => {
        sponsoredRequestStore.set(record.id, record);
        return record;
      },
      findById: async (id: string) => sponsoredRequestStore.get(id) ?? null,
      findLatestApprovedBySubjectAndWallet: async (input: {
        kind: SponsoredTransactionRequestRecord["kind"];
        subjectId: string;
        walletId: string;
      }) =>
        [...sponsoredRequestStore.values()]
          .filter(
            (record) =>
              record.kind === input.kind &&
              record.status === "APPROVED" &&
              record.subjectId === input.subjectId &&
              record.walletId === input.walletId &&
              record.submittedAt === null
          )
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null,
      listByOrganizationId: async (organizationId: string) =>
        [...sponsoredRequestStore.values()].filter(
          (record) => record.organizationId === organizationId
        ),
      update: async (
        id: string,
        updates: Partial<
          Omit<
            SponsoredTransactionRequestRecord,
            "id" | "organizationId" | "createdAt" | "requestedByUserId" | "walletId"
          >
        >
      ) => {
        const existing = sponsoredRequestStore.get(id);

        if (!existing) {
          throw new Error(`missing sponsored transaction request ${id}`);
        }

        const next = { ...existing, ...updates };
        sponsoredRequestStore.set(id, next);
        return next;
      }
    },
    walletProfiles: {
      findByWalletId: async () => null
    }
  } as unknown as Release12Repositories;

  return {
    release12Repositories,
    sponsoredRequestStore
  };
}
