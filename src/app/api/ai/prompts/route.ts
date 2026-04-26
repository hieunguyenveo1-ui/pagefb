import { prisma } from "@/lib/prisma";
import { promptTemplateSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  const workspace = await getDefaultWorkspace();
  const body = await request.json();
  const parsed = promptTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Invalid prompt template payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const template = await prisma.promptTemplate.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: input.name,
      },
    },
    update: input,
    create: {
      workspaceId: workspace.id,
      ...input,
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: "AI_PROMPT_CREATED",
      actorName: "Admin",
      entityType: "PromptTemplate",
      entityId: template.id,
      message: `Saved prompt template ${template.name}.`,
    },
  });

  return Response.json({ template }, { status: 201 });
}
