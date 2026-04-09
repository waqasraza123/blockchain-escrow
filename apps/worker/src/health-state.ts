export interface WorkerRunSnapshot {
  readonly activatedDraftCount: number;
  readonly activeOperatorAlertCount: number;
  readonly autoResolvedOperatorAlertCount: number;
  readonly blockedMilestoneSettlementPreparationCount: number;
  readonly clearedFundingReconciliationCount: number;
  readonly clearedMilestoneSettlementExecutionReconciliationCount: number;
  readonly expiredMilestoneReviewDeadlineCount: number;
  readonly preparedMilestoneSettlementCount: number;
  readonly reconciledDraftCustodyStateCount: number;
  readonly reconciledFundingTransactionCount: number;
  readonly reconciledMilestoneSettlementExecutionTransactionCount: number;
  readonly reopenedOperatorAlertCount: number;
  readonly scannedDraftCustodyStateCount: number;
  readonly scannedDraftCount: number;
  readonly scannedFundingTransactionCount: number;
  readonly scannedMilestoneReviewDeadlineCount: number;
  readonly scannedMilestoneReviewDeadlineDraftCount: number;
  readonly scannedMilestoneSettlementDraftCount: number;
  readonly scannedMilestoneSettlementExecutionTransactionCount: number;
  readonly scannedMilestoneSettlementRequestCount: number;
  readonly scannedOperatorAlertSourceCount: number;
  readonly stalePendingMilestoneSettlementExecutionCount: number;
  readonly stalePendingEscalationCount: number;
}

export interface WorkerHealthSnapshot {
  readonly lastError: string | null;
  readonly lastRunCompletedAt: string | null;
  readonly lastRunStartedAt: string | null;
  readonly lastRunSummary: WorkerRunSnapshot | null;
  readonly ready: boolean;
  readonly service: "worker";
}

export class HealthState {
  private lastError: string | null = null;
  private lastRunCompletedAt: string | null = null;
  private lastRunStartedAt: string | null = null;
  private lastRunSummary: WorkerRunSnapshot | null = null;
  private ready = false;

  markRunStarted(startedAt: string): void {
    this.lastRunStartedAt = startedAt;
  }

  markRunCompleted(completedAt: string, summary: WorkerRunSnapshot): void {
    this.lastError = null;
    this.lastRunCompletedAt = completedAt;
    this.lastRunSummary = summary;
    this.ready = true;
  }

  markRunFailed(error: unknown): void {
    this.lastError =
      error instanceof Error ? error.message : "worker reconciliation failed";
    this.ready = false;
  }

  snapshot(): WorkerHealthSnapshot {
    return {
      lastError: this.lastError,
      lastRunCompletedAt: this.lastRunCompletedAt,
      lastRunStartedAt: this.lastRunStartedAt,
      lastRunSummary: this.lastRunSummary,
      ready: this.ready,
      service: "worker"
    };
  }
}
