CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "OrganizationInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "AuditAction" AS ENUM (
  'AUTH_LOGOUT',
  'AUTH_NONCE_ISSUED',
  'AUTH_SESSION_VERIFIED',
  'ORGANIZATION_CREATED',
  'ORGANIZATION_INVITE_ACCEPTED',
  'ORGANIZATION_INVITE_CREATED',
  'ORGANIZATION_MEMBER_REMOVED',
  'ORGANIZATION_MEMBER_ROLE_UPDATED'
);
CREATE TYPE "AuditEntityType" AS ENUM (
  'ORGANIZATION',
  'ORGANIZATION_INVITE',
  'ORGANIZATION_MEMBER',
  'SESSION',
  'USER',
  'WALLET'
);

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "chainId" INTEGER,
  "isPrimary" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallet_nonces" (
  "id" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "nonce" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  CONSTRAINT "wallet_nonces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "SessionStatus" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "lastSeenAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organizations" (
  "id" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_members" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_invites" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL,
  "status" "OrganizationInviteStatus" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "acceptedAt" TIMESTAMPTZ(3),
  CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "actorUserId" TEXT,
  "entityType" "AuditEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "organizationId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallets_address_key" ON "wallets"("address");
CREATE UNIQUE INDEX "wallet_nonces_nonce_key" ON "wallet_nonces"("nonce");
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organizationId", "userId");
CREATE UNIQUE INDEX "organization_invites_tokenHash_key" ON "organization_invites"("tokenHash");

CREATE INDEX "wallets_user_id_idx" ON "wallets"("userId");
CREATE INDEX "wallet_nonces_wallet_address_idx" ON "wallet_nonces"("walletAddress");
CREATE INDEX "wallet_nonces_expires_at_idx" ON "wallet_nonces"("expiresAt");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("userId");
CREATE INDEX "sessions_wallet_id_idx" ON "sessions"("walletId");
CREATE INDEX "sessions_status_idx" ON "sessions"("status");
CREATE INDEX "organizations_created_by_user_id_idx" ON "organizations"("createdByUserId");
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("userId");
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organizationId");
CREATE INDEX "organization_invites_organization_id_idx" ON "organization_invites"("organizationId");
CREATE INDEX "organization_invites_email_idx" ON "organization_invites"("email");
CREATE INDEX "organization_invites_status_idx" ON "organization_invites"("status");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organizationId");
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actorUserId");

ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "wallets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_invites"
  ADD CONSTRAINT "organization_invites_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_invites"
  ADD CONSTRAINT "organization_invites_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
