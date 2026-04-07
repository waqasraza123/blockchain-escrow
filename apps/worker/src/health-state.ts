export interface WorkerRunSnapshot {
  readonly activatedDraftCount: number;
  readonly clearedFundingReconciliationCount: number;
  readonly reconciledFundingTransactionCount: number;
  readonly scannedDraftCount: number;
  readonly scannedFundingTransactionCount: number;
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
