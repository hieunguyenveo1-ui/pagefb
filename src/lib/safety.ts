import type { FacebookPage, Workspace } from "@prisma/client";
import type { PostInput } from "@/lib/validation";

type SafetyContext = {
  hourlyPostLimit: number;
  dailyPostLimit: number;
  approvalThreshold?: number;
  blockThreshold?: number;
  existingHourlyPosts: number;
  existingDailyPosts: number;
  pageWindows?: PageRateWindow[];
  similarMessages: SimilarMessage[];
};

export type SafetyResult = {
  score: number;
  warnings: string[];
  level: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
  needsApproval: boolean;
  blocked: boolean;
  signals: SafetySignal[];
  similarityScore: number;
};

export type SimilarMessage = {
  id?: string;
  title?: string;
  message: string;
};

export type PageRateWindow = {
  pageId: string;
  pageName: string;
  hourlyPostLimit: number;
  dailyPostLimit: number;
  existingHourlyPosts: number;
  existingDailyPosts: number;
};

export type SafetySignal = {
  category: "workspace_rate_limit" | "page_rate_limit" | "similarity" | "marketing_claim" | "bulk_distribution";
  score: number;
  message: string;
  pageId?: string;
  metadata?: Record<string, string | number | boolean>;
};

export function normalizeMessage(message: string) {
  return message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateSimilarity(left: string, right: string) {
  const leftWords = new Set(normalizeMessage(left).split(" ").filter(Boolean));
  const rightWords = new Set(normalizeMessage(right).split(" ").filter(Boolean));

  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }

  const sharedWords = [...leftWords].filter((word) => rightWords.has(word));
  const totalWords = new Set([...leftWords, ...rightWords]);

  return sharedWords.length / totalWords.size;
}

export function assessPostSafety(input: PostInput, context: SafetyContext): SafetyResult {
  const signals: SafetySignal[] = [];
  const approvalThreshold = context.approvalThreshold ?? 40;
  const blockThreshold = context.blockThreshold ?? 70;
  let score = 0;

  if (input.pageIds.length > 5) {
    signals.push({
      category: "bulk_distribution",
      score: 25,
      message: "Đang chọn hơn 5 fanpage cho cùng một bài; nên chia lịch đăng và tùy biến nội dung.",
      metadata: { pageCount: input.pageIds.length },
    });
  }

  if (context.existingHourlyPosts + input.pageIds.length > context.hourlyPostLimit) {
    signals.push({
      category: "workspace_rate_limit",
      score: 30,
      message: "Vượt giới hạn đăng bài theo giờ của workspace.",
      metadata: {
        current: context.existingHourlyPosts,
        requested: input.pageIds.length,
        limit: context.hourlyPostLimit,
      },
    });
  }

  if (context.existingDailyPosts + input.pageIds.length > context.dailyPostLimit) {
    signals.push({
      category: "workspace_rate_limit",
      score: 30,
      message: "Vượt giới hạn đăng bài theo ngày của workspace.",
      metadata: {
        current: context.existingDailyPosts,
        requested: input.pageIds.length,
        limit: context.dailyPostLimit,
      },
    });
  }

  for (const pageWindow of context.pageWindows ?? []) {
    if (!input.pageIds.includes(pageWindow.pageId)) {
      continue;
    }

    if (pageWindow.existingHourlyPosts + 1 > pageWindow.hourlyPostLimit) {
      signals.push({
        category: "page_rate_limit",
        score: 25,
        pageId: pageWindow.pageId,
        message: `${pageWindow.pageName} vượt giới hạn đăng bài theo giờ.`,
        metadata: {
          current: pageWindow.existingHourlyPosts,
          requested: 1,
          limit: pageWindow.hourlyPostLimit,
        },
      });
    }

    if (pageWindow.existingDailyPosts + 1 > pageWindow.dailyPostLimit) {
      signals.push({
        category: "page_rate_limit",
        score: 25,
        pageId: pageWindow.pageId,
        message: `${pageWindow.pageName} vượt giới hạn đăng bài theo ngày.`,
        metadata: {
          current: pageWindow.existingDailyPosts,
          requested: 1,
          limit: pageWindow.dailyPostLimit,
        },
      });
    }
  }

  const similarityMatches = context.similarMessages.map((item) => ({
    ...item,
    similarity: calculateSimilarity(input.message, item.message),
  }));
  const topSimilarity = similarityMatches.reduce((top, item) => (item.similarity > top ? item.similarity : top), 0);

  if (topSimilarity >= 0.82) {
    signals.push({
      category: "similarity",
      score: 30,
      message: `Nội dung quá giống bài gần đây (${Math.round(topSimilarity * 100)}%).`,
      metadata: { similarity: Math.round(topSimilarity * 100) },
    });
  } else if (topSimilarity >= 0.65) {
    signals.push({
      category: "similarity",
      score: 15,
      message: `Nội dung có độ tương đồng đáng chú ý (${Math.round(topSimilarity * 100)}%).`,
      metadata: { similarity: Math.round(topSimilarity * 100) },
    });
  }

  if (/free|miễn phí|100%|cam kết|bảo đảm/i.test(input.message)) {
    signals.push({
      category: "marketing_claim",
      score: 10,
      message: "Nội dung chứa từ khóa marketing mạnh; nên kiểm duyệt thủ công trước khi đăng.",
    });
  }

  score = signals.reduce((total, signal) => total + signal.score, 0);
  const cappedScore = Math.min(score, 100);
  const blocked = cappedScore >= blockThreshold;
  const needsApproval = cappedScore >= approvalThreshold;
  const level = blocked ? "BLOCKED" : cappedScore >= 55 ? "HIGH" : cappedScore >= approvalThreshold ? "MEDIUM" : "LOW";

  return {
    score: cappedScore,
    warnings: signals.map((signal) => signal.message),
    level,
    needsApproval,
    blocked,
    signals,
    similarityScore: Math.round(topSimilarity * 100),
  };
}

export async function buildSafetyContext(
  prisma: {
    publishJob: {
      count: (args: {
        where: {
          workspaceId: string;
          runAt: { gte: Date };
          pageId?: string;
        };
      }) => Promise<number>;
    };
    post: {
      findMany: (args: {
        where: { workspaceId: string; createdAt: { gte: Date } };
        select: { id: true; title: true; message: true };
        take: number;
      }) => Promise<Array<{ id: string; title: string; message: string }>>;
    };
  },
  workspace: Workspace,
  pages: Array<Pick<FacebookPage, "id" | "name" | "hourlyPostLimit" | "dailyPostLimit">>,
): Promise<SafetyContext> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [existingHourlyPosts, existingDailyPosts, recentPosts, pageWindows] = await Promise.all([
    prisma.publishJob.count({ where: { workspaceId: workspace.id, runAt: { gte: oneHourAgo } } }),
    prisma.publishJob.count({ where: { workspaceId: workspace.id, runAt: { gte: oneDayAgo } } }),
    prisma.post.findMany({
      where: { workspaceId: workspace.id, createdAt: { gte: oneDayAgo } },
      select: { id: true, title: true, message: true },
      take: 30,
    }),
    Promise.all(
      pages.map(async (page) => {
        const [existingPageHourlyPosts, existingPageDailyPosts] = await Promise.all([
          prisma.publishJob.count({
            where: { workspaceId: workspace.id, pageId: page.id, runAt: { gte: oneHourAgo } },
          }),
          prisma.publishJob.count({
            where: { workspaceId: workspace.id, pageId: page.id, runAt: { gte: oneDayAgo } },
          }),
        ]);

        return {
          pageId: page.id,
          pageName: page.name,
          hourlyPostLimit: page.hourlyPostLimit,
          dailyPostLimit: page.dailyPostLimit,
          existingHourlyPosts: existingPageHourlyPosts,
          existingDailyPosts: existingPageDailyPosts,
        };
      }),
    ),
  ]);

  return {
    hourlyPostLimit: workspace.hourlyPostLimit,
    dailyPostLimit: workspace.dailyPostLimit,
    approvalThreshold: workspace.approvalThreshold,
    blockThreshold: workspace.blockThreshold,
    existingHourlyPosts,
    existingDailyPosts,
    pageWindows,
    similarMessages: recentPosts,
  };
}
