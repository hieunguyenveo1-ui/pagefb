import { getWebhookVerifyResponse, verifyMetaSignature } from "@/lib/meta-webhook";
import { prisma } from "@/lib/prisma";
import { inboxWebhookSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function GET(request: Request) {
  return getWebhookVerifyResponse(new URL(request.url));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const isVerified = verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"));

  if (!isVerified) {
    return Response.json({ message: "Invalid Meta webhook signature." }, { status: 401 });
  }

  const workspace = await getDefaultWorkspace();
  const parsed = inboxWebhookSchema.safeParse(JSON.parse(rawBody));

  if (!parsed.success) {
    return Response.json({ message: "Invalid inbox webhook payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const page = await prisma.facebookPage.findFirst({
    where: { workspaceId: workspace.id, id: input.pageId },
  });

  if (!page) {
    return Response.json({ message: "Fanpage not found." }, { status: 404 });
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      workspaceId_channel_customerExternalId_pageId: {
        workspaceId: workspace.id,
        channel: input.channel,
        customerExternalId: input.customerExternalId,
        pageId: page.id,
      },
    },
    update: {
      customerName: input.customerName,
      subject: input.subject,
      status: "OPEN",
      lastMessageAt: new Date(),
    },
    create: {
      workspaceId: workspace.id,
      pageId: page.id,
      channel: input.channel,
      customerExternalId: input.customerExternalId,
      customerName: input.customerName,
      subject: input.subject,
      status: "OPEN",
      lastMessageAt: new Date(),
    },
  });

  const message = await prisma.inboxMessage.create({
    data: {
      workspaceId: workspace.id,
      conversationId: conversation.id,
      externalMessageId: input.externalMessageId || null,
      direction: "INBOUND",
      body: input.body,
      sentAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: "INBOX_MESSAGE_RECEIVED",
      actorName: "Meta Webhook",
      entityType: "InboxMessage",
      entityId: message.id,
      message: `Received ${input.channel.toLowerCase()} from ${input.customerName}.`,
    },
  });

  return Response.json({ conversation, message }, { status: 201 });
}
