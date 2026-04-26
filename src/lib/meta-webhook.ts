import crypto from "node:crypto";

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.META_APP_SECRET;

  if (!secret) {
    return process.env.WEBHOOK_MODE !== "live";
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}

export function getWebhookVerifyResponse(url: URL) {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const configuredToken = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "devin-demo-token";

  if (mode === "subscribe" && token === configuredToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return Response.json({ message: "Webhook verification failed." }, { status: 403 });
}
