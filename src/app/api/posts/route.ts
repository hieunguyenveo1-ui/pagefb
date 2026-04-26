import { PostStatus, PostTargetStatus, PublishJobStatus } from "@prisma/client";
import { persistSafetyReview } from "@/lib/approval";
import { assessPostSafety, buildSafetyContext } from "@/lib/safety";
import { postSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const workspace = await getDefaultWorkspace();
  const body = await request.json();
  const parsed = postSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Invalid post payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;

  const pages = await prisma.facebookPage.findMany({
    where: {
      workspaceId: workspace.id,
      id: {
        in: input.pageIds,
      },
    },
  });

  if (pages.length !== input.pageIds.length) {
    return Response.json({ message: "One or more fanpages were not found." }, { status: 400 });
  }

  const now = new Date();
  const runAt = input.action === "publish" ? now : input.scheduledAt ? new Date(input.scheduledAt) : null;

  if (input.action === "schedule" && (!runAt || runAt.getTime() <= now.getTime())) {
    return Response.json({ message: "Scheduled time must be in the future." }, { status: 400 });
  }

  const safety = assessPostSafety(input, await buildSafetyContext(prisma, workspace, pages));

  const status =
    input.action === "draft" || safety.needsApproval
      ? safety.needsApproval
        ? PostStatus.REVIEW
        : PostStatus.DRAFT
      : input.action === "publish"
        ? PostStatus.QUEUED
        : PostStatus.SCHEDULED;

  const post = await prisma.post.create({
    data: {
      workspaceId: workspace.id,
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl || null,
      mediaUrl: input.mediaUrl || null,
      scheduledAt: runAt,
      status,
      safetyScore: safety.score,
      safetyWarnings: JSON.stringify(safety.warnings),
      targets: {
        create: pages.map((page) => ({
          pageId: page.id,
          status: input.action === "draft" || safety.needsApproval ? PostTargetStatus.PENDING : PostTargetStatus.QUEUED,
        })),
      },
      publishJobs:
        input.action === "draft" || safety.needsApproval || !runAt
          ? undefined
          : {
              create: pages.map((page) => ({
                workspaceId: workspace.id,
                pageId: page.id,
                runAt,
                status: PublishJobStatus.PENDING,
              })),
            },
    },
    include: {
      targets: {
        include: {
          page: true,
        },
      },
      publishJobs: true,
    },
  });

  await persistSafetyReview(prisma, post, safety, input.action, runAt);

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: input.action === "draft" || safety.needsApproval ? "POST_CREATED" : "POST_SCHEDULED",
      actorName: "Admin",
      entityType: "Post",
      entityId: post.id,
      message: `${safety.needsApproval ? "Created review request for" : input.action === "draft" ? "Created" : "Queued"} post "${post.title}" for ${pages.length} fanpage(s).`,
      metadata: JSON.stringify({ safety }),
    },
  });

  if (safety.warnings.length > 0) {
    await prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        action: "SAFETY_WARNING",
        actorName: "Safety Guard",
        entityType: "Post",
        entityId: post.id,
        message: safety.warnings.join(" "),
        metadata: JSON.stringify({ safetyScore: safety.score }),
      },
    });
  }

  return Response.json(
    {
      post,
      safety,
      message: safety.needsApproval
        ? "Post saved for approval before publishing because risk score requires review."
        : "Post accepted.",
    },
    { status: 201 },
  );
}
