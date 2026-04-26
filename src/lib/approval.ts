import type { Post } from "@prisma/client";
import type { SafetyResult } from "@/lib/safety";

type ApprovalClient = {
  riskSignal: {
    createMany: (args: {
      data: Array<{
        workspaceId: string;
        postId: string;
        pageId?: string;
        level: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
        score: number;
        category: string;
        message: string;
        metadata: string;
      }>;
    }) => Promise<unknown>;
  };
  approvalRequest: {
    create: (args: {
      data: {
        workspaceId: string;
        postId: string;
        riskScore: number;
        riskLevel: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
        requestedAction?: string;
        requestedRunAt?: Date;
        reasons: string;
      };
    }) => Promise<unknown>;
  };
  auditLog: {
    createMany: (args: {
      data: Array<{
        workspaceId: string;
        action: "APPROVAL_REQUESTED" | "RISK_SIGNAL_CREATED";
        actorName: string;
        entityType: string;
        entityId: string;
        message: string;
        metadata?: string;
      }>;
    }) => Promise<unknown>;
  };
};

export async function persistSafetyReview(
  prisma: ApprovalClient,
  post: Pick<Post, "id" | "workspaceId">,
  safety: SafetyResult,
  requestedAction = "draft",
  requestedRunAt?: Date | null,
) {
  if (safety.signals.length > 0) {
    await prisma.riskSignal.createMany({
      data: safety.signals.map((signal) => ({
        workspaceId: post.workspaceId,
        postId: post.id,
        pageId: signal.pageId,
        level: safety.level,
        score: signal.score,
        category: signal.category,
        message: signal.message,
        metadata: JSON.stringify(signal.metadata ?? {}),
      })),
    });
  }

  if (safety.needsApproval) {
    await prisma.approvalRequest.create({
      data: {
        workspaceId: post.workspaceId,
        postId: post.id,
        riskScore: safety.score,
        riskLevel: safety.level,
        requestedAction,
        requestedRunAt: requestedRunAt ?? undefined,
        reasons: JSON.stringify(safety.warnings),
      },
    });
  }

  if (safety.signals.length > 0 || safety.needsApproval) {
    await prisma.auditLog.createMany({
      data: [
        ...(safety.signals.length > 0
          ? [
              {
                workspaceId: post.workspaceId,
                action: "RISK_SIGNAL_CREATED" as const,
                actorName: "Safety Guard",
                entityType: "Post",
                entityId: post.id,
                message: `Recorded ${safety.signals.length} risk signal(s) at ${safety.level.toLowerCase()} level.`,
                metadata: JSON.stringify({ score: safety.score, similarityScore: safety.similarityScore }),
              },
            ]
          : []),
        ...(safety.needsApproval
          ? [
              {
                workspaceId: post.workspaceId,
                action: "APPROVAL_REQUESTED" as const,
                actorName: "Safety Guard",
                entityType: "Post",
                entityId: post.id,
                message: `Approval required before publishing because risk score is ${safety.score}.`,
                metadata: JSON.stringify({ level: safety.level, reasons: safety.warnings }),
              },
            ]
          : []),
      ],
    });
  }
}
