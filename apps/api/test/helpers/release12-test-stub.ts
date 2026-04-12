import type {
  GasPolicyRecord,
  Release12Repositories,
  SponsoredTransactionRequestRecord,
  WalletProfileRecord
} from "@blockchain-escrow/db";

type SponsoredRequestStore = Map<string, SponsoredTransactionRequestRecord>;
type GasPolicyStore = Map<string, GasPolicyRecord>;
type WalletProfileStore = Map<string, WalletProfileRecord>;

export function createRelease12RepositoriesStub() {
  const sponsoredRequestStore: SponsoredRequestStore = new Map();
  const gasPolicyStore: GasPolicyStore = new Map();
  const walletProfileStore: WalletProfileStore = new Map();

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
      countApprovedCreatedSince: async (input: {
        gasPolicyId: string;
        organizationId: string;
        since: string;
      }) =>
        [...sponsoredRequestStore.values()].filter(
          (record) =>
            record.gasPolicyId === input.gasPolicyId &&
            record.organizationId === input.organizationId &&
            record.approvedAt !== null &&
            new Date(record.approvedAt).getTime() >= new Date(input.since).getTime()
        ).length,
      create: async (record: SponsoredTransactionRequestRecord) => {
        sponsoredRequestStore.set(record.id, record);
        return record;
      },
      expireIfStillPending: async (input: { evaluatedAt: string; id: string }) => {
        const existing = sponsoredRequestStore.get(input.id);

        if (
          !existing ||
          existing.status !== "APPROVED" ||
          existing.submittedAt !== null ||
          new Date(existing.expiresAt).getTime() > new Date(input.evaluatedAt).getTime()
        ) {
          return null;
        }

        const next: SponsoredTransactionRequestRecord = {
          ...existing,
          status: "EXPIRED",
          updatedAt: input.evaluatedAt
        };
        sponsoredRequestStore.set(input.id, next);
        return next;
      },
      findById: async (id: string) => sponsoredRequestStore.get(id) ?? null,
      findLatestOpenBySubjectAndWallet: async (input: {
        kind: SponsoredTransactionRequestRecord["kind"];
        subjectId: string;
        walletId: string;
      }) =>
        [...sponsoredRequestStore.values()]
          .filter(
            (record) =>
              record.kind === input.kind &&
              record.subjectId === input.subjectId &&
              record.walletId === input.walletId &&
              (record.status === "PENDING" ||
                (record.status === "APPROVED" &&
                  record.submittedAt === null &&
                  new Date(record.expiresAt).getTime() > Date.now()))
          )
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null,
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
              record.submittedAt === null &&
              new Date(record.expiresAt).getTime() > Date.now()
          )
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null,
      listAll: async () =>
        [...sponsoredRequestStore.values()].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt)
        ),
      listApprovedPendingByExpiresAt: async (expiresAt: string) =>
        [...sponsoredRequestStore.values()]
          .filter(
            (record) =>
              record.status === "APPROVED" &&
              record.submittedAt === null &&
              new Date(record.expiresAt).getTime() <= new Date(expiresAt).getTime()
          )
          .sort(
            (left, right) =>
              new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime() ||
              left.createdAt.localeCompare(right.createdAt)
          ),
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
      findByWalletId: async (walletId: string) => walletProfileStore.get(walletId) ?? null,
      listByWalletIds: async (walletIds: string[]) =>
        walletIds
          .map((walletId) => walletProfileStore.get(walletId) ?? null)
          .filter((record): record is WalletProfileRecord => record !== null),
      upsert: async (record: WalletProfileRecord) => {
        walletProfileStore.set(record.walletId, record);
        return record;
      }
    }
  } as unknown as Release12Repositories;

  return {
    gasPolicyStore,
    release12Repositories,
    sponsoredRequestStore,
    walletProfileStore
  };
}
