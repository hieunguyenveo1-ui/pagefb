import { PostStatus, PostTargetStatus, PublishJobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { approvalReviewSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  const workspace = await getDefaultWorkspace();
  const body = await request.json();
  const parsed = approvalReviewSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Invalid approval review payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const approval = await prisma.approvalRequest.findFirst({
    where: { id: input.approvalRequestId, workspaceId: workspace.id },
    include: {
      post: {
        include: {
          targets: true,
        },
      },
    },
  });

  if (!approval) {
    return Response.json({ message: "Approval request not found." }, { status: 404 });
  }

  if (approval.status !== "PENDING") {
    return Response.json({ message: "Approval request has already been reviewed." }, { status: 409 });
  }

  const approved = input.decision === "approve";
  const scheduledAt = approval.requestedRunAt;
  const shouldQueue = approved && approval.requestedAction !== "draft" && scheduledAt;

  await prisma.approvalRequest.update({
    where: { id: approval.id },
    data: {
      status: approved ? "APPROVED" : "REJECTED",
      reviewedByName: "Admin",
      reviewNotes: input.reviewNotes || null,
      reviewedAt: new Date(),
    },
  });

  await prisma.post.update({
    where: { id: approval.postId },
    data: {
      status: approved ? (shouldQueue ? PostStatus.SCHEDULED : PostStatus.DRAFT) : PostStatus.CANCELLED,
      targets: {
        updateMany: {
          where: { postId: approval.postId },
          data: { status: shouldQueue ? PostTargetStatus.QUEUED : PostTargetStatus.PENDING },
        },
      },
      publishJobs: shouldQueue
        ? {
            create: approval.post.targets.map((target) => ({
              workspaceId: workspace.id,
              pageId: target.pageId,
              runAt: scheduledAt,
              status: PublishJobStatus.PENDING,
            })),
          }
        : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: approved ? "APPROVAL_APPROVED" : "APPROVAL_REJECTED",
      actorName: "Admin",
      entityType: "ApprovalRequest",
      entityId: approval.id,
      message: `${approved ? "Approved" : "Rejected"} risk review for post "${approval.post.title}".`,
      metadata: JSON.stringify({ riskScore: approval.riskScore, riskLevel: approval.riskLevel }),
    },
  });

  return Response.json({ message: approved ? "Approval accepted." : "Approval rejected." }, { status: 200 });
}
