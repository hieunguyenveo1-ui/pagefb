import { PostStatus, PostTargetStatus, PublishJobStatus } from "@prisma/client";
import { assessPostSafety } from "@/lib/safety";
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
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const runAt = input.action === "publish" ? now : input.scheduledAt ? new Date(input.scheduledAt) : null;

  if (input.action === "schedule" && (!runAt || runAt.getTime() <= now.getTime())) {
    return Response.json({ message: "Scheduled time must be in the future." }, { status: 400 });
  }

  const [existingHourlyPosts, existingDailyPosts, recentPosts] = await Promise.all([
    prisma.publishJob.count({
      where: {
        workspaceId: workspace.id,
        runAt: { gte: oneHourAgo },
      },
    }),
    prisma.publishJob.count({
      where: {
        workspaceId: workspace.id,
        runAt: { gte: oneDayAgo },
      },
    }),
    prisma.post.findMany({
      where: {
        workspaceId: workspace.id,
        createdAt: { gte: oneDayAgo },
      },
      select: {
        message: true,
      },
      take: 30,
    }),
  ]);

  const safety = assessPostSafety(input, {
    hourlyPostLimit: workspace.hourlyPostLimit,
    dailyPostLimit: workspace.dailyPostLimit,
    existingHourlyPosts,
    existingDailyPosts,
    similarMessages: recentPosts.map((post) => post.message),
  });

  if (input.action !== "draft" && safety.score >= 70) {
    return Response.json(
      {
        message: "Safety guard blocked publishing. Save as draft or reduce selected pages/frequency.",
        safety,
      },
      { status: 409 },
    );
  }

  const status =
    input.action === "draft" ? PostStatus.DRAFT : input.action === "publish" ? PostStatus.QUEUED : PostStatus.SCHEDULED;

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
          status: input.action === "draft" ? PostTargetStatus.PENDING : PostTargetStatus.QUEUED,
        })),
      },
      publishJobs:
        input.action === "draft" || !runAt
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

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: input.action === "draft" ? "POST_CREATED" : "POST_SCHEDULED",
      actorName: "Admin",
      entityType: "Post",
      entityId: post.id,
      message: `${input.action === "draft" ? "Created" : "Queued"} post "${post.title}" for ${pages.length} fanpage(s).`,
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

  return Response.json({ post, safety }, { status: 201 });
}
