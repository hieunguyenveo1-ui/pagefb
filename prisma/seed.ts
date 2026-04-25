import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      name: "Demo Agency",
      slug: "demo-agency",
      hourlyPostLimit: 4,
      dailyPostLimit: 12,
    },
  });

  const account = await prisma.facebookAccount.upsert({
    where: {
      workspaceId_facebookUserId: {
        workspaceId: workspace.id,
        facebookUserId: "fb-user-demo-001",
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      facebookUserId: "fb-user-demo-001",
      name: "Hieu Nguyen",
      email: "demo@example.com",
      accessTokenHint: "mock-token",
    },
  });

  const pages = [
    {
      facebookPageId: "page-demo-001",
      name: "VEO Studio",
      category: "Marketing Agency",
      followersCount: 12400,
    },
    {
      facebookPageId: "page-demo-002",
      name: "VEO Shop",
      category: "E-commerce",
      followersCount: 8200,
    },
    {
      facebookPageId: "page-demo-003",
      name: "VEO Academy",
      category: "Education",
      followersCount: 5600,
    },
  ];

  for (const page of pages) {
    await prisma.facebookPage.upsert({
      where: {
        workspaceId_facebookPageId: {
          workspaceId: workspace.id,
          facebookPageId: page.facebookPageId,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        accountId: account.id,
        facebookPageId: page.facebookPageId,
        name: page.name,
        category: page.category,
        followersCount: page.followersCount,
        accessTokenHint: "mock-page-token",
        lastSyncedAt: new Date(),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
