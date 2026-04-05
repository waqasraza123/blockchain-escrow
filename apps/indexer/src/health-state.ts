import type { IsoTimestamp } from "@blockchain-escrow/shared";

function now(): IsoTimestamp {
  return new Date().toISOString();
}

export interface HealthSnapshot {
  readonly driftError: string | null;
  readonly lastDriftCheckAt: IsoTimestamp | null;
  readonly lastSyncCompletedAt: IsoTimestamp | null;
  readonly lastSyncError: string | null;
  readonly lastSyncStartedAt: IsoTimestamp | null;
  readonly live: true;
  readonly ready: boolean;
  readonly service: "indexer";
  readonly startedAt: IsoTimestamp;
}

export class HealthState {
  private readonly startedAt = now();
  private driftError: string | null = null;
  private lastDriftCheckAt: IsoTimestamp | null = null;
  private lastSyncCompletedAt: IsoTimestamp | null = null;
  private lastSyncError: string | null = null;
  private lastSyncStartedAt: IsoTimestamp | null = null;
  private ready = false;

  markDriftFailure(error: unknown): void {
    this.lastDriftCheckAt = now();
    this.driftError = error instanceof Error ? error.message : String(error);
    this.ready = false;
  }

  markDriftSuccess(): void {
    this.lastDriftCheckAt = now();
    this.driftError = null;
  }

  markSyncFailure(error: unknown): void {
    this.lastSyncCompletedAt = now();
    this.lastSyncError = error instanceof Error ? error.message : String(error);
    this.ready = false;
  }

  markSyncStart(): void {
    this.lastSyncStartedAt = now();
  }

  markSyncSuccess(): void {
    this.lastSyncCompletedAt = now();
    this.lastSyncError = null;
    this.ready = this.driftError === null;
  }

  snapshot(): HealthSnapshot {
    return {
      driftError: this.driftError,
      lastDriftCheckAt: this.lastDriftCheckAt,
      lastSyncCompletedAt: this.lastSyncCompletedAt,
      lastSyncError: this.lastSyncError,
      lastSyncStartedAt: this.lastSyncStartedAt,
      live: true,
      ready: this.ready,
      service: "indexer",
      startedAt: this.startedAt
    };
  }
}
