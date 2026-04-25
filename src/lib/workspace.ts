import { prisma } from "@/lib/prisma";

export async function getDefaultWorkspace() {
  const existing = await prisma.workspace.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.workspace.create({
    data: {
      name: "Demo Agency",
      slug: "demo-agency",
    },
  });
}
