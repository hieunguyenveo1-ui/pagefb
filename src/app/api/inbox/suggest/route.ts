import { suggestInboxReply } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { inboxSuggestSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  const workspace = await getDefaultWorkspace();
  const body = await request.json();
  const parsed = inboxSuggestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Invalid reply suggestion payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: parsed.data.conversationId, workspaceId: workspace.id },
    include: {
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });

  if (!conversation) {
    return Response.json({ message: "Conversation not found." }, { status: 404 });
  }

  const latestMessage = conversation.messages[0];
  const suggestion = suggestInboxReply(conversation.customerName, latestMessage?.body ?? conversation.subject);
  const message = await prisma.inboxMessage.create({
    data: {
      workspaceId: workspace.id,
      conversationId: conversation.id,
      direction: "AI_SUGGESTION",
      body: suggestion,
      aiSuggested: true,
      confidenceScore: 86,
      sentAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: "INBOX_REPLY_SUGGESTED",
      actorName: "AI Studio",
      entityType: "InboxMessage",
      entityId: message.id,
      message: `Suggested a reply for ${conversation.customerName}.`,
    },
  });

  return Response.json({ message }, { status: 201 });
}
