import { facebookPageSchema } from "@/lib/validation";
import { getDefaultWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const workspace = await getDefaultWorkspace();
  const body = await request.json();
  const parsed = facebookPageSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ message: "Invalid fanpage payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;

  const account = await prisma.facebookAccount.findFirst({
    where: {
      id: input.accountId,
      workspaceId: workspace.id,
    },
  });

  if (!account) {
    return Response.json({ message: "Facebook account not found." }, { status: 404 });
  }

  const page = await prisma.facebookPage.create({
    data: {
      workspaceId: workspace.id,
      accountId: account.id,
      facebookPageId: input.facebookPageId,
      name: input.name,
      category: input.category || null,
      followersCount: input.followersCount,
      accessTokenHint: "mock-page-token",
      lastSyncedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      action: "PAGE_CREATED",
      actorName: "Admin",
      entityType: "FacebookPage",
      entityId: page.id,
      message: `Added fanpage ${page.name}.`,
    },
  });

  return Response.json({ page }, { status: 201 });
}
