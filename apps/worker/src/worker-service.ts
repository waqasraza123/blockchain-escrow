import {
  createPrismaClient,
  createPrismaRelease4Repositories,
  createRelease1Repositories
} from "@blockchain-escrow/db";

import type { WorkerConfig } from "./config";
import { DraftActivationReconciler } from "./draft-activation-reconciler";
import { HealthState } from "./health-state";

export class WorkerService {
  private readonly prisma = createPrismaClient();
  private readonly release1Repositories = createRelease1Repositories(this.prisma);
  private readonly release4Repositories = createPrismaRelease4Repositories(this.prisma);
  private readonly draftActivationReconciler: DraftActivationReconciler;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly config: WorkerConfig,
    private readonly healthState: HealthState
  ) {
    this.draftActivationReconciler = new DraftActivationReconciler(
      this.release1Repositories,
      this.release4Repositories,
      this.config.chainId
    );
  }

  async start(): Promise<void> {
    await this.runCycle(true);

    if (this.config.runOnce) {
      return;
    }

    this.intervalHandle = setInterval(() => {
      void this.runCycle(false);
    }, this.config.pollIntervalMs);
  }

  async close(): Promise<void> {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    await this.prisma.$disconnect();
  }

  private async runCycle(throwOnError: boolean): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const startedAt = new Date().toISOString();
    this.healthState.markRunStarted(startedAt);

    try {
      const summary = await this.draftActivationReconciler.reconcileOnce();
      this.healthState.markRunCompleted(new Date().toISOString(), summary);
    } catch (error) {
      this.healthState.markRunFailed(error);
      console.error("Worker reconciliation failed", error);

      if (throwOnError) {
        throw error;
      }
    } finally {
      this.isRunning = false;
    }
  }
}
