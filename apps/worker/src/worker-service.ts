import {
  createPrismaClient,
  createPrismaRelease4Repositories,
  createRelease1Repositories,
  createRelease8Repositories
} from "@blockchain-escrow/db";

import type { WorkerConfig } from "./config";
import { DraftCustodyStateReconciler } from "./draft-custody-state-reconciler";
import { DraftActivationReconciler } from "./draft-activation-reconciler";
import { FundingReconciler } from "./funding-reconciler";
import { HealthState } from "./health-state";
import { MilestoneReviewDeadlineReconciler } from "./milestone-review-deadline-reconciler";
import { MilestoneSettlementExecutionReconciler } from "./milestone-settlement-execution-reconciler";
import { MilestoneSettlementPreparationReconciler } from "./milestone-settlement-preparation-reconciler";
import { OperatorAlertReconciler } from "./operator-alert-reconciler";

export class WorkerService {
  private readonly prisma = createPrismaClient();
  private readonly release1Repositories = createRelease1Repositories(this.prisma);
  private readonly release4Repositories = createPrismaRelease4Repositories(this.prisma);
  private readonly release8Repositories = createRelease8Repositories(this.prisma);
  private readonly draftCustodyStateReconciler: DraftCustodyStateReconciler;
  private readonly draftActivationReconciler: DraftActivationReconciler;
  private readonly fundingReconciler: FundingReconciler;
  private readonly milestoneReviewDeadlineReconciler: MilestoneReviewDeadlineReconciler;
  private readonly milestoneSettlementExecutionReconciler: MilestoneSettlementExecutionReconciler;
  private readonly milestoneSettlementPreparationReconciler: MilestoneSettlementPreparationReconciler;
  private readonly operatorAlertReconciler: OperatorAlertReconciler;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly config: WorkerConfig,
    private readonly healthState: HealthState
  ) {
    this.draftCustodyStateReconciler = new DraftCustodyStateReconciler(
      this.release1Repositories,
      this.release4Repositories,
      this.config.chainId
    );
    this.draftActivationReconciler = new DraftActivationReconciler(
      this.release1Repositories,
      this.release4Repositories,
      this.config.chainId
    );
    this.fundingReconciler = new FundingReconciler(
      this.release1Repositories,
      this.release4Repositories,
      this.config.chainId,
      this.config.fundingReconciliation
    );
    this.milestoneReviewDeadlineReconciler =
      new MilestoneReviewDeadlineReconciler(this.release1Repositories);
    this.milestoneSettlementExecutionReconciler =
      new MilestoneSettlementExecutionReconciler(
        this.release1Repositories,
        this.release4Repositories,
        this.config.chainId,
        this.config.milestoneSettlementExecutionReconciliation
      );
    this.milestoneSettlementPreparationReconciler =
      new MilestoneSettlementPreparationReconciler(
        this.release1Repositories,
        this.release4Repositories,
        this.config.chainId
      );
    this.operatorAlertReconciler = new OperatorAlertReconciler(
      this.release1Repositories,
      this.release4Repositories,
      this.release8Repositories,
      this.config.chainId,
      this.config.operatorAlerts
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
      const [
        draftCustodyStateSummary,
        draftActivationSummary,
        fundingSummary,
        operatorAlertSummary,
        milestoneReviewDeadlineSummary,
        milestoneSettlementExecutionSummary,
        milestoneSettlementPreparationSummary
      ] = await Promise.all([
        this.draftCustodyStateReconciler.reconcileOnce(),
        this.draftActivationReconciler.reconcileOnce(),
        this.fundingReconciler.reconcileOnce(),
        this.operatorAlertReconciler.reconcileOnce(),
        this.milestoneReviewDeadlineReconciler.reconcileOnce(),
        this.milestoneSettlementExecutionReconciler.reconcileOnce(),
        this.milestoneSettlementPreparationReconciler.reconcileOnce()
      ]);
      const summary = {
        ...draftCustodyStateSummary,
        ...draftActivationSummary,
        ...fundingSummary,
        ...operatorAlertSummary,
        ...milestoneReviewDeadlineSummary,
        ...milestoneSettlementExecutionSummary,
        ...milestoneSettlementPreparationSummary
      };
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
