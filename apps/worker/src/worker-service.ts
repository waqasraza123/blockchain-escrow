import {
  createPrismaClient,
  createPrismaRelease4Repositories,
  createRelease1Repositories,
  createRelease11Repositories,
  createRelease12Repositories,
  createRelease8Repositories,
  createRelease9Repositories
} from "@blockchain-escrow/db";

import type { WorkerConfig } from "./config";
import { DraftCustodyStateReconciler } from "./draft-custody-state-reconciler";
import { DraftActivationReconciler } from "./draft-activation-reconciler";
import { FinanceExportReconciler } from "./finance-export-reconciler";
import { FundingReconciler } from "./funding-reconciler";
import { HealthState } from "./health-state";
import { MilestoneReviewDeadlineReconciler } from "./milestone-review-deadline-reconciler";
import { MilestoneSettlementExecutionReconciler } from "./milestone-settlement-execution-reconciler";
import { MilestoneSettlementPreparationReconciler } from "./milestone-settlement-preparation-reconciler";
import { OperatorAlertReconciler } from "./operator-alert-reconciler";
import { PartnerWebhookDeliveryReconciler } from "./partner-webhook-delivery-reconciler";
import { SponsoredTransactionRequestReconciler } from "./sponsored-transaction-request-reconciler";
import { TenantInvoiceReconciler } from "./tenant-invoice-reconciler";

export class WorkerService {
  private readonly prisma = createPrismaClient();
  private readonly release1Repositories = createRelease1Repositories(this.prisma);
  private readonly release4Repositories = createPrismaRelease4Repositories(this.prisma);
  private readonly release8Repositories = createRelease8Repositories(this.prisma);
  private readonly release9Repositories = createRelease9Repositories(this.prisma);
  private readonly release11Repositories = createRelease11Repositories(this.prisma);
  private readonly release12Repositories = createRelease12Repositories(this.prisma);
  private readonly draftCustodyStateReconciler: DraftCustodyStateReconciler;
  private readonly draftActivationReconciler: DraftActivationReconciler;
  private readonly financeExportReconciler: FinanceExportReconciler;
  private readonly fundingReconciler: FundingReconciler;
  private readonly milestoneReviewDeadlineReconciler: MilestoneReviewDeadlineReconciler;
  private readonly milestoneSettlementExecutionReconciler: MilestoneSettlementExecutionReconciler;
  private readonly milestoneSettlementPreparationReconciler: MilestoneSettlementPreparationReconciler;
  private readonly operatorAlertReconciler: OperatorAlertReconciler;
  private readonly partnerWebhookDeliveryReconciler: PartnerWebhookDeliveryReconciler;
  private readonly sponsoredTransactionRequestReconciler: SponsoredTransactionRequestReconciler;
  private readonly tenantInvoiceReconciler: TenantInvoiceReconciler;
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
    this.financeExportReconciler = new FinanceExportReconciler(
      this.release1Repositories,
      this.release4Repositories,
      this.release9Repositories,
      this.config.chainId
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
    this.partnerWebhookDeliveryReconciler = new PartnerWebhookDeliveryReconciler(
      this.release1Repositories,
      this.release11Repositories,
      this.config.partnerWebhooks
    );
    this.sponsoredTransactionRequestReconciler =
      new SponsoredTransactionRequestReconciler(
        this.release1Repositories,
        this.release12Repositories
      );
    this.tenantInvoiceReconciler = new TenantInvoiceReconciler(this.release11Repositories);
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
        financeExportSummary,
        fundingSummary,
        operatorAlertSummary,
        partnerWebhookDeliverySummary,
        sponsoredTransactionRequestSummary,
        tenantInvoiceSummary,
        milestoneReviewDeadlineSummary,
        milestoneSettlementExecutionSummary,
        milestoneSettlementPreparationSummary
      ] = await Promise.all([
        this.draftCustodyStateReconciler.reconcileOnce(),
        this.draftActivationReconciler.reconcileOnce(),
        this.financeExportReconciler.reconcileOnce(),
        this.fundingReconciler.reconcileOnce(),
        this.operatorAlertReconciler.reconcileOnce(),
        this.partnerWebhookDeliveryReconciler.reconcileOnce(),
        this.sponsoredTransactionRequestReconciler.reconcileOnce(),
        this.tenantInvoiceReconciler.reconcileOnce(),
        this.milestoneReviewDeadlineReconciler.reconcileOnce(),
        this.milestoneSettlementExecutionReconciler.reconcileOnce(),
        this.milestoneSettlementPreparationReconciler.reconcileOnce()
      ]);
      const summary = {
        ...draftCustodyStateSummary,
        ...draftActivationSummary,
        ...financeExportSummary,
        ...fundingSummary,
        ...operatorAlertSummary,
        ...partnerWebhookDeliverySummary,
        ...sponsoredTransactionRequestSummary,
        ...tenantInvoiceSummary,
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
