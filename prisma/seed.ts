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
    const createdPage = await prisma.facebookPage.upsert({
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

    if (page.facebookPageId === "page-demo-001") {
      const conversation = await prisma.conversation.upsert({
        where: {
          workspaceId_channel_customerExternalId_pageId: {
            workspaceId: workspace.id,
            channel: "MESSENGER",
            customerExternalId: "customer-demo-001",
            pageId: createdPage.id,
          },
        },
        update: {},
        create: {
          workspaceId: workspace.id,
          pageId: createdPage.id,
          channel: "MESSENGER",
          customerExternalId: "customer-demo-001",
          customerName: "Minh Anh",
          subject: "Hỏi demo quản lý fanpage",
          priority: 1,
        },
      });

      const existingMessage = await prisma.inboxMessage.findFirst({
        where: {
          workspaceId: workspace.id,
          conversationId: conversation.id,
          externalMessageId: "msg-demo-001",
        },
      });

      if (!existingMessage) {
        await prisma.inboxMessage.createMany({
          data: [
            {
              workspaceId: workspace.id,
              conversationId: conversation.id,
              externalMessageId: "msg-demo-001",
              direction: "INBOUND",
              body: "Shop mình có 5 fanpage, muốn xem demo đăng bài theo lịch và quản lý inbox thì chi phí thế nào?",
            },
            {
              workspaceId: workspace.id,
              conversationId: conversation.id,
              direction: "AI_SUGGESTION",
              body: "Chào Minh Anh, bên em có thể demo quy trình quản lý 5 fanpage, lập lịch đăng bài và gom inbox vào một màn hình. Anh/chị cho em xin ngành hàng để tư vấn gói phù hợp ạ?",
              aiSuggested: true,
              confidenceScore: 88,
            },
          ],
        });
      }
    }
  }

  const provider = await prisma.aiProvider.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: "Mock GPT Workspace",
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      kind: "OPENAI",
      name: "Mock GPT Workspace",
      model: "gpt-4o-mini",
      apiKeyHint: "mock••••demo",
      enabled: true,
    },
  });

  const template = await prisma.promptTemplate.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: "Caption bán hàng thân thiện",
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      name: "Caption bán hàng thân thiện",
      goal: "Tạo bài đăng bán hàng nhưng không spam, có CTA rõ ràng",
      tone: "Chuyên nghiệp, thân thiện, đáng tin cậy",
      language: "vi",
      prompt:
        "Viết caption Facebook tiếng Việt cho {{topic}}, hướng tới {{audience}}. Tạo CTA rõ ràng, hashtag phù hợp và 3 biến thể ngắn để A/B test.",
    },
  });

  const existingGeneration = await prisma.aiGeneration.findFirst({
    where: {
      workspaceId: workspace.id,
      topic: "Ra mắt dịch vụ quản lý fanpage bằng AI",
    },
  });

  if (!existingGeneration) {
    await prisma.aiGeneration.create({
      data: {
        workspaceId: workspace.id,
        providerId: provider.id,
        templateId: template.id,
        topic: "Ra mắt dịch vụ quản lý fanpage bằng AI",
        audience: "chủ shop, agency và đội marketing SME",
        caption:
          "Quản lý nhiều fanpage không cần rối.\n\nFanpage Manager Pro giúp đội marketing lập lịch đăng bài, kiểm duyệt nội dung AI và chăm sóc inbox tập trung trên một dashboard.\n\nĐăng ký demo để xem workflow phù hợp với mô hình của bạn.",
        hashtags: JSON.stringify(["#FanpageManager", "#AIStudio", "#SocialCommerce", "#ChamSocKhachHang"]),
        variants: JSON.stringify([
          "Tập trung toàn bộ fanpage, lịch đăng và inbox vào một nơi để đội marketing vận hành chuyên nghiệp hơn.",
          "Dùng AI để tạo caption, hashtag và biến thể nhưng vẫn có bước duyệt trước khi đăng.",
          "Theo dõi account, fanpage, queue đăng bài và hội thoại khách hàng trong một dashboard SaaS.",
        ]),
        status: "REVIEW",
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
