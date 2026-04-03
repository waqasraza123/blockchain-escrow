import test from "node:test";
import assert from "node:assert/strict";

import { AuthenticatedSessionService } from "../src/modules/auth/authenticated-session.service";
import { UsersService } from "../src/modules/users/users.service";
import {
  authConfiguration,
  FakeSessionTokenService,
  seedAuthenticatedActor
} from "./helpers/auth-test-context";
import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";

function createUsersService() {
  const repositories = new InMemoryRelease1Repositories();
  const sessionTokenService = new FakeSessionTokenService();
  const authenticatedSessionService = new AuthenticatedSessionService(
    repositories,
    authConfiguration,
    sessionTokenService
  );

  return {
    repositories,
    sessionTokenService,
    usersService: new UsersService(authenticatedSessionService)
  };
}

test("users service returns the current authenticated user", async () => {
  const { repositories, sessionTokenService, usersService } = createUsersService();
  const actor = await seedAuthenticatedActor(repositories, sessionTokenService);

  const response = await usersService.getCurrentUser({
    cookieHeader: actor.cookieHeader,
    ipAddress: "127.0.0.1",
    userAgent: "test-agent"
  });

  assert.equal(response.user.id, actor.userId);
  assert.equal(response.user.createdAt, repositories.userRecords[0]?.createdAt);
  assert.equal(repositories.sessionRecords[0]?.lastSeenAt !== null, true);
});
