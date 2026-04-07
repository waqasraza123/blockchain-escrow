export interface MilestoneReviewConfiguration {
  reviewDeadlineSeconds: number;
}

export const MILESTONE_REVIEW_CONFIGURATION = Symbol(
  "MILESTONE_REVIEW_CONFIGURATION"
);

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received "${value}".`);
  }

  return parsed;
}

export function loadMilestoneReviewConfiguration(): MilestoneReviewConfiguration {
  return {
    reviewDeadlineSeconds: parsePositiveInteger(
      process.env.MILESTONE_REVIEW_DEADLINE_SECONDS,
      7 * 24 * 60 * 60
    )
  };
}
