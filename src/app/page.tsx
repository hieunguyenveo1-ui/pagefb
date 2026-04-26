import { PostStatus } from "@prisma/client";
import { connection } from "next/server";
import { AccountPageManager } from "@/components/account-page-manager";
import { AiStudio } from "@/components/ai-studio";
import { PostComposer } from "@/components/post-composer";
import { RiskDashboard } from "@/components/risk-dashboard";
import { UnifiedInbox } from "@/components/unified-inbox";
import { prisma } from "@/lib/prisma";
import { getDefaultWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

function parseWarnings(warnings: string) {
  try {
    const parsed = JSON.parse(warnings) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function getStatusTone(status: string) {
  if (status.includes("published") || status.includes("success") || status.includes("active")) {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
  }

  if (status.includes("failed") || status.includes("cancelled") || status.includes("disabled")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (status.includes("scheduled") || status.includes("pending") || status.includes("queued") || status.includes("running")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-black/[0.04] text-[#424245] border-black/[0.07]";
}

export default async function Home() {
  await connection();

  const workspace = await getDefaultWorkspace();
  const [
    accounts,
    pages,
    posts,
    jobs,
    auditLogs,
    providers,
    templates,
    generations,
    conversations,
    approvals,
    riskSignals,
  ] = await Promise.all([
    prisma.facebookAccount.findMany({
      where: { workspaceId: workspace.id },
      include: { pages: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.facebookPage.findMany({
      where: { workspaceId: workspace.id },
      include: { account: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.findMany({
      where: { workspaceId: workspace.id },
      include: {
        targets: {
          include: {
            page: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.publishJob.findMany({
      where: { workspaceId: workspace.id },
      include: {
        post: true,
        page: true,
      },
      orderBy: { runAt: "asc" },
      take: 8,
    }),
    prisma.auditLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.aiProvider.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.promptTemplate.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aiGeneration.findMany({
      where: { workspaceId: workspace.id },
      include: {
        provider: true,
        template: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.conversation.findMany({
      where: { workspaceId: workspace.id },
      include: {
        page: true,
        messages: {
          orderBy: { sentAt: "desc" },
          take: 6,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 8,
    }),
    prisma.approvalRequest.findMany({
      where: { workspaceId: workspace.id },
      include: { post: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.riskSignal.findMany({
      where: { workspaceId: workspace.id },
      include: {
        page: true,
        post: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const scheduledPosts = posts.filter((post) => post.status === PostStatus.SCHEDULED).length;
  const publishedPosts = posts.filter((post) => post.status === PostStatus.PUBLISHED).length;
  const draftPosts = posts.filter((post) => post.status === PostStatus.DRAFT).length;
  const openConversations = conversations.filter((conversation) => conversation.status === "OPEN").length;
  const pendingApprovals = approvals.filter((approval) => approval.status === "PENDING").length;

  return (
    <main className="min-h-screen overflow-hidden text-[#1d1d1f]">
      <section className="mx-auto flex w-full max-w-[1720px] gap-6 px-4 py-4 lg:px-6 lg:py-6">
        <aside className="apple-glass sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 rounded-[2.25rem] p-5 text-[#1d1d1f] xl:flex xl:flex-col">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5e5ce6] text-lg font-bold text-white shadow-lg shadow-blue-500/20">
                F
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1d1d1f]">Fanpage Manager</p>
                <p className="text-xs text-[#86868b]">Commercial SaaS MVP</p>
              </div>
            </div>
            <div className="mt-8 rounded-[1.75rem] border border-black/[0.06] bg-white/65 p-4 shadow-sm">
              <p className="apple-eyebrow">Workspace</p>
              <p className="mt-3 text-xl font-semibold tracking-tight">{workspace.name}</p>
              <p className="mt-1 text-sm leading-6 text-[#6e6e73]">Đội vận hành đa fanpage cho marketing, sales và CSKH.</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-2 text-sm">
            {[
              ["01", "Dashboard overview", "Tổng quan realtime"],
              ["02", "Campaign composer", "Tạo nội dung và lên lịch"],
              ["03", "AI Studio", "Prompt, biến thể, duyệt nội dung"],
              ["04", "Unified Inbox", "Message/comment + AI reply"],
              ["05", "Accounts & pages", "Quản trị kết nối"],
              ["06", "Safety & compliance", "Kiểm soát rủi ro"],
            ].map(([icon, title, description], index) => (
              <div
                key={title}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                  index === 0 ? "border-[#0071e3]/20 bg-[#0071e3]/10 shadow-sm" : "border-transparent bg-transparent hover:bg-white/55"
                }`}
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/65 text-[0.65rem] font-bold tracking-tight text-[#86868b] shadow-sm">
                  {icon}
                </span>
                <span>
                  <span className="block font-semibold text-[#1d1d1f]">{title}</span>
                  <span className="mt-1 block text-xs text-[#86868b]">{description}</span>
                </span>
              </div>
            ))}
          </nav>

          <div className="mt-auto rounded-[1.75rem] border border-emerald-500/10 bg-emerald-50/80 p-4">
            <p className="text-sm font-semibold text-emerald-700">Safety guard active</p>
            <div className="mt-3 space-y-2 text-sm text-[#6e6e73]">
              <p>{workspace.hourlyPostLimit} post targets/giờ</p>
              <p>{workspace.dailyPostLimit} post targets/ngày</p>
              <p>Chặn publish khi risk score quá cao</p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="apple-glass rounded-[2.25rem] px-6 py-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-4xl">
                <p className="apple-eyebrow">Fanpage Manager Pro</p>
                <h1 className="mt-3 max-w-5xl text-5xl font-semibold tracking-[-0.055em] text-[#1d1d1f] lg:text-7xl">
                  Fanpage operations, được thiết kế tinh giản như Apple.
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-[#6e6e73]">
                  Không gian làm việc sáng, tối giản và tập trung: quản lý tài khoản, AI content, inbox, lịch đăng và kiểm
                  duyệt rủi ro trong một trải nghiệm premium.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href="#composer"
                    className="apple-primary rounded-full px-5 py-3 text-sm font-semibold text-white transition"
                  >
                    Tạo chiến dịch
                  </a>
                  <a
                    href="#ai-studio"
                    className="rounded-full border border-black/[0.08] bg-white/70 px-5 py-3 text-sm font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-white"
                  >
                    Mở AI Studio
                  </a>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:w-[34rem]">
                {[
                  ["Workspace health", "Ổn định", "bg-emerald-500/10 text-emerald-700"],
                  ["Publish mode", "Mock", "bg-[#0071e3]/10 text-[#0066cc]"],
                  ["AI Studio", `${providers.length} provider`, "bg-[#5856d6]/10 text-[#5856d6]"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-[1.5rem] border border-black/[0.06] bg-white/62 p-4 shadow-sm">
                    <p className="text-sm text-[#86868b]">{label}</p>
                    <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              ["Facebook accounts", accounts.length, "Tài khoản đã kết nối vào workspace."],
              ["Fanpages", pages.length, "Kênh phân phối sẵn sàng cho chiến dịch."],
              ["Draft posts", draftPosts, "Nội dung chờ duyệt hoặc hoàn thiện."],
              ["Risk approvals", pendingApprovals, "Nội dung cần duyệt trước khi publish."],
              ["Open inbox", openConversations, "Tin nhắn/comment cần chăm sóc."],
            ].map(([label, value, hint], index) => (
              <div
                key={label}
                className={`rounded-[1.75rem] p-5 ${
                  index === 0
                    ? "border border-black/[0.06] bg-[#1d1d1f] text-white shadow-[0_22px_55px_-38px_rgba(29,29,31,0.8)]"
                    : "apple-card bg-white/78 backdrop-blur"
                }`}
              >
                <p className={`text-sm ${index === 0 ? "text-white/70" : "text-[#86868b]"}`}>{label}</p>
                <p className="mt-3 text-4xl font-bold">{value}</p>
                <p className={`mt-3 text-sm leading-6 ${index === 0 ? "text-white/55" : "text-[#86868b]"}`}>{hint}</p>
              </div>
            ))}
          </section>

          <RiskDashboard workspace={workspace} pages={pages} approvals={approvals} riskSignals={riskSignals} />

          <AiStudio providers={providers} templates={templates} generations={generations} pages={pages} />

          <UnifiedInbox conversations={conversations} />

          <div className="grid gap-6 2xl:grid-cols-[1.35fr_0.95fr]">
            <PostComposer pages={pages} />

            <div className="grid gap-6">
              <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-1">
                <section className="apple-glass rounded-[2.25rem] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="apple-eyebrow">Connected accounts</p>
                      <h2 className="mt-2 text-2xl font-semibold">Tài khoản đang hoạt động</h2>
                    </div>
                    <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-semibold text-[#0066cc]">
                      {accounts.length} account
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {accounts.map((account) => (
                      <div key={account.id} className="rounded-[1.5rem] border border-black/[0.06] bg-white/62 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#1d1d1f]">{account.name}</p>
                            <p className="mt-1 text-sm text-[#86868b]">{account.pages.length} fanpage đang liên kết</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(account.status.toLowerCase())}`}>
                            {account.status.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {accounts.length === 0 && <p className="text-sm text-[#86868b]">Chưa có account. Chạy seed để có dữ liệu demo.</p>}
                  </div>
                </section>

                <section className="apple-glass rounded-[2.25rem] p-6">
                  <p className="apple-eyebrow">Safety & compliance</p>
                  <h2 className="mt-2 text-2xl font-semibold">Vận hành an toàn để thương mại hóa</h2>
                  <div className="mt-5 grid gap-3">
                    {[
                      `Giới hạn giờ: ${workspace.hourlyPostLimit} post targets/giờ`,
                      `Giới hạn ngày: ${workspace.dailyPostLimit} post targets/ngày`,
                      `Yêu cầu duyệt thủ công khi safety score từ ${workspace.approvalThreshold}`,
                      `Chặn publish trực tiếp khi safety score từ ${workspace.blockThreshold}`,
                      "Mock publish không gọi Meta API thật cho tới khi bật live mode",
                    ].map((item) => (
                      <div key={item} className="rounded-2xl bg-black/[0.025] px-4 py-3 text-sm text-[#6e6e73]">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <AccountPageManager accounts={accounts} />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="apple-glass rounded-[2.25rem] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="apple-eyebrow">Fanpages</p>
                  <h2 className="mt-2 text-2xl font-semibold">Danh sách fanpage</h2>
                </div>
                <span className="rounded-full bg-[#1d1d1f] px-3 py-1 text-xs font-semibold text-white">{pages.length} page</span>
              </div>
              <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-black/[0.07]">
                <div className="grid grid-cols-[1.2fr_1fr_auto] gap-3 border-b border-black/[0.07] bg-black/[0.025] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#86868b]">
                  <p>Fanpage</p>
                  <p>Owner</p>
                  <p>Status</p>
                </div>
                <div className="divide-y divide-black/[0.05]">
                  {pages.map((page) => (
                    <div key={page.id} className="grid grid-cols-[1.2fr_1fr_auto] gap-3 px-4 py-4">
                      <div>
                        <p className="font-semibold text-[#1d1d1f]">{page.name}</p>
                        <p className="mt-1 text-sm text-[#86868b]">{page.category ?? "Fanpage"}</p>
                      </div>
                      <div className="text-sm text-[#6e6e73]">
                        <p>{page.account.name}</p>
                        <p className="mt-1 text-[#86868b]">{page.followersCount.toLocaleString("vi-VN")} followers</p>
                      </div>
                      <div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(page.status.toLowerCase())}`}>
                          {page.status.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="apple-glass rounded-[2.25rem] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="apple-eyebrow">Publish queue</p>
                  <h2 className="mt-2 text-2xl font-semibold">Lịch chạy chiến dịch</h2>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{jobs.length} job</span>
              </div>
              <div className="mt-5 grid gap-3">
                {jobs.map((job) => (
                  <div key={job.id} className="rounded-[1.5rem] border border-black/[0.06] bg-white/62 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#1d1d1f]">{job.post.title}</p>
                        <p className="mt-1 text-sm text-[#86868b]">{job.page.name}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(job.status.toLowerCase())}`}>
                        {job.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[#86868b]">
                      <p>{job.runAt.toLocaleString("vi-VN")}</p>
                      <p>{job.attempts} lần thử</p>
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && <p className="text-sm text-[#86868b]">Chưa có job đăng bài.</p>}
              </div>
            </section>
          </div>

          <section className="apple-glass rounded-[2.25rem] p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="apple-eyebrow">Recent posts</p>
                <h2 className="mt-2 text-2xl font-semibold">Chiến dịch nội dung gần đây</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Draft", draftPosts],
                  ["Scheduled", scheduledPosts],
                  ["Published", publishedPosts],
                ].map(([label, count]) => (
                  <span key={label} className="rounded-full bg-black/[0.04] px-3 py-1 text-sm font-semibold text-[#424245]">
                    {label}: {count}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              {posts.map((post) => {
                const warnings = parseWarnings(post.safetyWarnings);

                return (
                  <article key={post.id} className="rounded-[1.75rem] border border-black/[0.07] bg-white/64 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-4xl">
                        <p className="font-semibold text-[#1d1d1f]">{post.title}</p>
                        <p className="mt-2 text-sm leading-7 text-[#6e6e73]">{post.message}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(post.status.toLowerCase())}`}>
                        {post.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.targets.map((target) => (
                        <span
                          key={target.id}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(target.status.toLowerCase())}`}
                        >
                          {target.page.name}: {target.status.toLowerCase()}
                        </span>
                      ))}
                    </div>
                    {warnings.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <p className="font-semibold">Safety score {post.safetyScore}</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                );
              })}
              {posts.length === 0 && <p className="text-sm text-[#86868b]">Chưa có bài đăng.</p>}
            </div>
          </section>

          <section className="apple-glass rounded-[2.25rem] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="apple-eyebrow">Audit log</p>
                <h2 className="mt-2 text-2xl font-semibold">Dòng thời gian vận hành</h2>
              </div>
              <span className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-semibold text-[#424245]">{auditLogs.length} events</span>
            </div>
            <div className="mt-5 grid gap-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex gap-4 rounded-[1.5rem] border border-black/[0.06] bg-white/62 p-4 shadow-sm">
                  <div className="mt-1 size-3 shrink-0 rounded-full bg-[#0071e3]/100" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#1d1d1f]">{log.action.toLowerCase().replaceAll("_", " ")}</p>
                      <p className="text-xs text-[#86868b]">{log.createdAt.toLocaleString("vi-VN")}</p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[#6e6e73]">{log.message}</p>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && <p className="text-sm text-[#86868b]">Chưa có log.</p>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
