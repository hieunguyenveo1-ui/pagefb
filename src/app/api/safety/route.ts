import { assessPostSafety, buildSafetyContext } from "@/lib/safety";
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
  const pages = await prisma.facebookPage.findMany({
    where: {
      workspaceId: workspace.id,
      id: {
        in: input.pageIds,
      },
    },
  });

  const safety = assessPostSafety(input, await buildSafetyContext(prisma, workspace, pages));

  return Response.json({ safety });
}
