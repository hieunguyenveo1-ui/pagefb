import { prisma } from "@/lib/prisma";
import { persistSafetyReview } from "@/lib/approval";
import { assessPostSafety, buildSafetyContext } from "@/lib/safety";
import { aiApproveSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  const workspace = await getDefaultWorkspace();
  const body = await request.json();
  const parsed = aiApproveSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Invalid approval payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const generation = await prisma.aiGeneration.findFirst({
    where: { id: input.generationId, workspaceId: workspace.id },
  });

  if (!generation) {
    return Response.json({ message: "AI generation not found." }, { status: 404 });
  }

  const pages = await prisma.facebookPage.findMany({
    where: { workspaceId: workspace.id, id: { in: input.pageIds } },
  });

  if (pages.length === 0) {
    return Response.json({ message: "Select at least one valid fanpage." }, { status: 400 });
  }

  const safety = assessPostSafety(
    {
      title: generation.topic,
      message: generation.caption,
      pageIds: pages.map((page) => page.id),
      scheduledAt: input.scheduledAt || undefined,
      action: input.action,
    },
    await buildSafetyContext(prisma, workspace, pages),
  );
  const scheduledAt = input.action === "schedule" && input.scheduledAt ? new Date(input.scheduledAt) : null;
  const shouldQueue = input.action === "schedule" && scheduledAt && !safety.needsApproval;
  const post = await prisma.post.create({
    data: {
      workspaceId: workspace.id,
      title: generation.topic,
      message: generation.caption,
      scheduledAt,
      status: safety.needsApproval ? "REVIEW" : input.action === "schedule" ? "SCHEDULED" : "DRAFT",
      safetyScore: safety.score,
      safetyWarnings: JSON.stringify(safety.warnings),
      targets: {
        create: pages.map((page) => ({
          pageId: page.id,
          status: shouldQueue ? "QUEUED" : "PENDING",
        })),
      },
      publishJobs:
        shouldQueue
          ? {
              create: pages.map((page) => ({
                workspaceId: workspace.id,
                pageId: page.id,
                runAt: scheduledAt,
                status: "PENDING",
              })),
            }
          : undefined,
    },
  });

  await persistSafetyReview(prisma, post, safety, input.action, scheduledAt);

  await prisma.aiGeneration.update({
    where: { id: generation.id },
    data: {
      status: "CONVERTED_TO_POST",
      postId: post.id,
      reviewNotes: input.reviewNotes || null,
      approvedByName: "Admin",
      approvedAt: new Date(),
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        action: "POST_APPROVED",
        actorName: "Admin",
        entityType: "AiGeneration",
        entityId: generation.id,
        message: `Approved AI content and converted it to ${safety.needsApproval ? "a review post" : input.action === "schedule" ? "a scheduled post" : "a draft"}.`,
        metadata: JSON.stringify({ safety }),
      },
      {
        workspaceId: workspace.id,
        action: shouldQueue ? "POST_SCHEDULED" : "POST_CREATED",
        actorName: "Admin",
        entityType: "Post",
        entityId: post.id,
        message: `Created ${safety.needsApproval ? "review" : "post"} from AI Studio for ${pages.length} fanpage(s).`,
      },
    ],
  });

  return Response.json({ post, safety }, { status: 201 });
}
