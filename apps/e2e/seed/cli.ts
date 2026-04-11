import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

import { seedOutputPath } from "../support/paths";
import { seedScenarios } from "./scenarios";

async function resetDatabase() {
  const prisma = new PrismaClient();

  try {
    const tables = (await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
      ORDER BY tablename ASC
    `).map((row) => row.tablename);

    if (tables.length > 0) {
      const quoted = tables.map((table) => `"public"."${table}"`).join(", ");
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function seedDatabase() {
  const prisma = new PrismaClient();

  try {
    const metadata = await seedScenarios(prisma);
    fs.mkdirSync(path.dirname(seedOutputPath), { recursive: true });
    fs.writeFileSync(seedOutputPath, JSON.stringify(metadata, null, 2), "utf8");
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const command = process.argv[2];

  if (command !== "reset" && command !== "seed") {
    throw new Error("Usage: tsx seed/cli.ts <reset|seed>");
  }

  await resetDatabase();

  if (command === "seed") {
    await seedDatabase();
  }
}

void main();
