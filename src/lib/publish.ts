import { PostStatus, PostTargetStatus, PublishJobStatus } from "@prisma/client";
import { publishToFacebookPage } from "@/lib/meta";
import { prisma } from "@/lib/prisma";

export async function runDuePublishJobs() {
  const now = new Date();
  const jobs = await prisma.publishJob.findMany({
    where: {
      status: PublishJobStatus.PENDING,
      runAt: {
        lte: now,
      },
    },
    include: {
      post: true,
      page: true,
    },
    orderBy: {
      runAt: "asc",
    },
    take: 20,
  });

  const results = [];

  for (const job of jobs) {
    await prisma.publishJob.update({
      where: { id: job.id },
      data: {
        status: PublishJobStatus.RUNNING,
        attempts: { increment: 1 },
        lockedAt: now,
      },
    });

    try {
      const result = await publishToFacebookPage(job.post, job.page);

      await prisma.$transaction([
        prisma.publishJob.update({
          where: { id: job.id },
          data: {
            status: PublishJobStatus.SUCCESS,
            completedAt: new Date(),
          },
        }),
        prisma.postTarget.update({
          where: {
            postId_pageId: {
              postId: job.postId,
              pageId: job.pageId,
            },
          },
          data: {
            status: PostTargetStatus.PUBLISHED,
            facebookPostId: result.facebookPostId,
            publishedAt: new Date(),
            errorMessage: null,
          },
        }),
        prisma.post.update({
          where: { id: job.postId },
          data: {
            status: PostStatus.PUBLISHED,
          },
        }),
        prisma.auditLog.create({
          data: {
            workspaceId: job.workspaceId,
            action: "POST_PUBLISHED",
            actorName: "Publisher",
            entityType: "Post",
            entityId: job.postId,
            message: `Published "${job.post.title}" to ${job.page.name}.`,
            metadata: JSON.stringify({ pageId: job.pageId, facebookPostId: result.facebookPostId }),
          },
        }),
      ]);

      results.push({ jobId: job.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown publish error.";

      await prisma.$transaction([
        prisma.publishJob.update({
          where: { id: job.id },
          data: {
            status: PublishJobStatus.FAILED,
            lastError: message,
            completedAt: new Date(),
          },
        }),
        prisma.postTarget.update({
          where: {
            postId_pageId: {
              postId: job.postId,
              pageId: job.pageId,
            },
          },
          data: {
            status: PostTargetStatus.FAILED,
            errorMessage: message,
          },
        }),
        prisma.post.update({
          where: { id: job.postId },
          data: {
            status: PostStatus.FAILED,
          },
        }),
        prisma.auditLog.create({
          data: {
            workspaceId: job.workspaceId,
            action: "POST_FAILED",
            actorName: "Publisher",
            entityType: "Post",
            entityId: job.postId,
            message,
            metadata: JSON.stringify({ pageId: job.pageId }),
          },
        }),
      ]);

      results.push({ jobId: job.id, ok: false, error: message });
    }
  }

  return results;
}
