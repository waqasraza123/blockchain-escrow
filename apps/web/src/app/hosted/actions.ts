"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createHostedFile,
  createHostedMilestoneSubmission,
  createHostedVersionAcceptance,
  exchangeHostedLaunchSession,
  linkHostedDisputeEvidence,
  prepareHostedMilestoneSubmission
} from "../../lib/api";

const hostedCookieName =
  process.env.API_PARTNER_HOSTED_COOKIE_NAME?.trim() || "bes_hosted_session";

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing field: ${key}`);
  }

  return value.trim();
}

export async function exchangeHostedSessionAction(formData: FormData) {
  const launchToken = requiredString(formData, "launchToken");
  const exchanged = await exchangeHostedLaunchSession(launchToken);
  const cookieStore = await cookies();
  cookieStore.set(hostedCookieName, exchanged.sessionToken, {
    expires: new Date(exchanged.expiresAt),
    httpOnly: true,
    path: "/"
  });
  redirect(`/hosted/${launchToken}/workspace`);
}

export async function submitHostedVersionAcceptanceAction(formData: FormData) {
  const launchToken = requiredString(formData, "launchToken");
  await createHostedVersionAcceptance({
    signature: requiredString(formData, "signature")
  });
  redirect(`/hosted/${launchToken}/workspace`);
}

export async function submitHostedMilestoneAction(formData: FormData) {
  const launchToken = requiredString(formData, "launchToken");
  const statementMarkdown = requiredString(formData, "statementMarkdown");
  const prepared = await prepareHostedMilestoneSubmission({ statementMarkdown });
  await createHostedMilestoneSubmission({
    scheme: "EIP712",
    signature: requiredString(formData, "signature"),
    statementMarkdown,
    typedData: prepared.challenge.typedData
  });
  redirect(`/hosted/${launchToken}/workspace`);
}

export async function uploadHostedEvidenceAction(formData: FormData) {
  const launchToken = requiredString(formData, "launchToken");
  const file = await createHostedFile({
    byteSize: Number(requiredString(formData, "byteSize")),
    category: requiredString(formData, "category"),
    mediaType: requiredString(formData, "mediaType"),
    originalFilename: requiredString(formData, "originalFilename"),
    sha256Hex: requiredString(formData, "sha256Hex"),
    storageKey: requiredString(formData, "storageKey")
  });
  await linkHostedDisputeEvidence({ fileId: file.file.id });
  redirect(`/hosted/${launchToken}/workspace`);
}

export async function clearHostedSessionAction(formData: FormData) {
  const launchToken = requiredString(formData, "launchToken");
  const cookieStore = await cookies();
  cookieStore.delete(hostedCookieName);
  redirect(`/hosted/${launchToken}`);
}
