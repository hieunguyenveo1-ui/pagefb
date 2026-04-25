import { assessPostSafety } from "@/lib/safety";
import { postSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const workspace = await getDefaultWorkspace();
  const body = await request.json();
  const parsed = postSchema.safeParse({ ...body, action: body.action ?? "draft" });

  if (!parsed.success) {
    return Response.json({ message: "Invalid safety payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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

  return Response.json({ safety });
}
