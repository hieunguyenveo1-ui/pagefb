import { generateCampaignContent } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { assessPostSafety } from "@/lib/safety";
import { aiGenerateSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  const workspace = await getDefaultWorkspace();
  const body = await request.json();
  const parsed = aiGenerateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Invalid generation payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const [provider, template, pages] = await Promise.all([
    prisma.aiProvider.findFirst({ where: { id: input.providerId, workspaceId: workspace.id, enabled: true } }),
    prisma.promptTemplate.findFirst({ where: { id: input.templateId, workspaceId: workspace.id } }),
    prisma.facebookPage.findMany({
      where: {
        workspaceId: workspace.id,
        id: input.pageIds.length > 0 ? { in: input.pageIds } : undefined,
      },
    }),
  ]);

  if (!provider || !template) {
    return Response.json({ message: "AI provider or prompt template not found." }, { status: 404 });
  }

  const generated = await generateCampaignContent({
    ...input,
    providerName: provider.name,
    templateName: template.name,
    tone: template.tone,
  });
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [existingHourlyPosts, existingDailyPosts, recentPosts] = await Promise.all([
    prisma.publishJob.count({ where: { workspaceId: workspace.id, runAt: { gte: oneHourAgo } } }),
    prisma.publishJob.count({ where: { workspaceId: workspace.id, runAt: { gte: oneDayAgo } } }),
    prisma.post.findMany({
      where: { workspaceId: workspace.id, createdAt: { gte: oneDayAgo } },
      select: { message: true },
      take: 30,
    }),
  ]);
  const safety = assessPostSafety(
    {
      title: input.topic,
      message: generated.caption,
      pageIds: pages.map((page) => page.id),
      action: "draft",
    },
    {
      hourlyPostLimit: workspace.hourlyPostLimit,
      dailyPostLimit: workspace.dailyPostLimit,
      existingHourlyPosts,
      existingDailyPosts,
      similarMessages: recentPosts.map((post) => post.message),
    },
  );
  const generation = await prisma.aiGeneration.create({
    data: {
      workspaceId: workspace.id,
      providerId: provider.id,
      templateId: template.id,
      topic: input.topic,
      audience: input.audience,
      caption: generated.caption,
      hashtags: JSON.stringify(generated.hashtags),
      variants: JSON.stringify(generated.variants),
      status: "REVIEW",
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: "AI_CONTENT_GENERATED",
      actorName: "AI Studio",
      entityType: "AiGeneration",
      entityId: generation.id,
      message: `Generated content for ${input.topic} using ${provider.name}.`,
      metadata: JSON.stringify({ safety }),
    },
  });

  return Response.json({ generation, safety }, { status: 201 });
}
