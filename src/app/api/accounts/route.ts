import { facebookAccountSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const workspace = await getDefaultWorkspace();
  const body = await request.json();
  const parsed = facebookAccountSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Invalid account payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;

  const account = await prisma.facebookAccount.create({
    data: {
      workspaceId: workspace.id,
      facebookUserId: input.facebookUserId,
      name: input.name,
      email: input.email || null,
      accessTokenHint: "mock-token",
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: "ACCOUNT_CREATED",
      actorName: "Admin",
      entityType: "FacebookAccount",
      entityId: account.id,
      message: `Connected Facebook account ${account.name}.`,
    },
  });

  return Response.json({ account }, { status: 201 });
}
