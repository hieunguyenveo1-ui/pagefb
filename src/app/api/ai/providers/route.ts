import { maskSecret } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { aiProviderSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  const workspace = await getDefaultWorkspace();
  const body = await request.json();
  const parsed = aiProviderSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Invalid AI provider payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const provider = await prisma.aiProvider.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: input.name,
      },
    },
    update: {
      kind: input.kind,
      model: input.model,
      apiKeyHint: maskSecret(input.apiKey ?? ""),
      baseUrl: input.baseUrl || null,
      enabled: input.enabled,
    },
    create: {
      workspaceId: workspace.id,
      kind: input.kind,
      name: input.name,
      model: input.model,
      apiKeyHint: maskSecret(input.apiKey ?? ""),
      baseUrl: input.baseUrl || null,
      enabled: input.enabled,
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: "AI_PROVIDER_CONFIGURED",
      actorName: "Admin",
      entityType: "AiProvider",
      entityId: provider.id,
      message: `Configured AI provider ${provider.name}.`,
    },
  });

  return Response.json({ provider }, { status: 201 });
}
