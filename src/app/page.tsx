import { PostStatus } from "@prisma/client";
import { connection } from "next/server";
import { AccountPageManager } from "@/components/account-page-manager";
import { PostComposer } from "@/components/post-composer";
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
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status.includes("failed") || status.includes("cancelled") || status.includes("disabled")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (status.includes("scheduled") || status.includes("pending") || status.includes("queued") || status.includes("running")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default async function Home() {
  await connection();

  const workspace = await getDefaultWorkspace();
  const [accounts, pages, posts, jobs, auditLogs] = await Promise.all([
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
  ]);

  const scheduledPosts = posts.filter((post) => post.status === PostStatus.SCHEDULED).length;
  const publishedPosts = posts.filter((post) => post.status === PostStatus.PUBLISHED).length;
  const draftPosts = posts.filter((post) => post.status === PostStatus.DRAFT).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_22%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_35%,#f8fafc_100%)] text-slate-950">
      <section className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-4 lg:px-6 lg:py-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.8)] xl:flex xl:flex-col">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-500/20 text-lg font-bold text-blue-200">
                F
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Fanpage Manager</p>
                <p className="text-xs text-slate-400">Commercial SaaS MVP</p>
              </div>
            </div>
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Workspace</p>
              <p className="mt-3 text-xl font-semibold">{workspace.name}</p>
              <p className="mt-1 text-sm text-slate-400">Đội vận hành đa fanpage cho marketing, sales và CSKH.</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-2 text-sm">
            {[
              ["Dashboard overview", "Tổng quan realtime"],
              ["Campaign composer", "Tạo nội dung và lên lịch"],
              ["Accounts & pages", "Quản trị kết nối"],
              ["Safety & compliance", "Kiểm soát rủi ro"],
            ].map(([title, description], index) => (
              <div
                key={title}
                className={`rounded-2xl border px-4 py-3 ${
                  index === 0 ? "border-blue-400/30 bg-blue-500/15" : "border-white/5 bg-white/0"
                }`}
              >
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs text-slate-400">{description}</p>
              </div>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-sm font-semibold text-emerald-200">Safety guard active</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <p>{workspace.hourlyPostLimit} post targets/giờ</p>
              <p>{workspace.dailyPostLimit} post targets/ngày</p>
              <p>Chặn publish khi risk score quá cao</p>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="rounded-[2rem] border border-white/70 bg-white/80 px-6 py-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-4xl">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">Fanpage Manager Pro</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 lg:text-5xl">
                  Giao diện quản trị fanpage hiện đại, sẵn sàng thương mại hóa.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                  Tối ưu cho agency hoặc doanh nghiệp vận hành nhiều Facebook account, nhiều fanpage, nhiều chiến dịch nội
                  dung trong cùng một dashboard chuyên nghiệp.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:w-[34rem]">
                {[
                  ["Workspace health", "Ổn định", "bg-emerald-50 text-emerald-700"],
                  ["Publish mode", "Mock", "bg-blue-50 text-blue-700"],
                  ["Commercial UI", "Ready", "bg-violet-50 text-violet-700"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-sm text-slate-500">{label}</p>
                    <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
            {[
              ["Facebook accounts", accounts.length, "Tài khoản đã kết nối vào workspace."],
              ["Fanpages", pages.length, "Kênh phân phối sẵn sàng cho chiến dịch."],
              ["Draft posts", draftPosts, "Nội dung chờ duyệt hoặc hoàn thiện."],
              ["Scheduled posts", scheduledPosts, "Bài đã đưa vào lịch đăng."],
              ["Published posts", publishedPosts, "Bài đã publish thành công."],
            ].map(([label, value, hint], index) => (
              <div
                key={label}
                className={`rounded-[1.75rem] border border-white/80 p-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.55)] ${
                  index === 0 ? "bg-slate-950 text-white" : "bg-white/90 backdrop-blur"
                }`}
              >
                <p className={`text-sm ${index === 0 ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
                <p className="mt-3 text-4xl font-bold">{value}</p>
                <p className={`mt-3 text-sm leading-6 ${index === 0 ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-6 2xl:grid-cols-[1.35fr_0.95fr]">
            <PostComposer pages={pages} />

            <div className="grid gap-6">
              <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-1">
                <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Connected accounts</p>
                      <h2 className="mt-2 text-2xl font-semibold">Tài khoản đang hoạt động</h2>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {accounts.length} account
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {accounts.map((account) => (
                      <div key={account.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">{account.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{account.pages.length} fanpage đang liên kết</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(account.status.toLowerCase())}`}>
                            {account.status.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {accounts.length === 0 && <p className="text-sm text-slate-500">Chưa có account. Chạy seed để có dữ liệu demo.</p>}
                  </div>
                </section>

                <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Safety & compliance</p>
                  <h2 className="mt-2 text-2xl font-semibold">Vận hành an toàn để thương mại hóa</h2>
                  <div className="mt-5 grid gap-3">
                    {[
                      `Giới hạn giờ: ${workspace.hourlyPostLimit} post targets/giờ`,
                      `Giới hạn ngày: ${workspace.dailyPostLimit} post targets/ngày`,
                      "Chặn tự động khi safety score từ 70 trở lên",
                      "Mock publish không gọi Meta API thật cho tới khi bật live mode",
                    ].map((item) => (
                      <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
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
            <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Fanpages</p>
                  <h2 className="mt-2 text-2xl font-semibold">Danh sách fanpage</h2>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">{pages.length} page</span>
              </div>
              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                <div className="grid grid-cols-[1.2fr_1fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <p>Fanpage</p>
                  <p>Owner</p>
                  <p>Status</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {pages.map((page) => (
                    <div key={page.id} className="grid grid-cols-[1.2fr_1fr_auto] gap-3 px-4 py-4">
                      <div>
                        <p className="font-semibold text-slate-950">{page.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{page.category ?? "Fanpage"}</p>
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>{page.account.name}</p>
                        <p className="mt-1 text-slate-500">{page.followersCount.toLocaleString("vi-VN")} followers</p>
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

            <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Publish queue</p>
                  <h2 className="mt-2 text-2xl font-semibold">Lịch chạy chiến dịch</h2>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{jobs.length} job</span>
              </div>
              <div className="mt-5 grid gap-3">
                {jobs.map((job) => (
                  <div key={job.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{job.post.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{job.page.name}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(job.status.toLowerCase())}`}>
                        {job.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-500">
                      <p>{job.runAt.toLocaleString("vi-VN")}</p>
                      <p>{job.attempts} lần thử</p>
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && <p className="text-sm text-slate-500">Chưa có job đăng bài.</p>}
              </div>
            </section>
          </div>

          <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Recent posts</p>
                <h2 className="mt-2 text-2xl font-semibold">Chiến dịch nội dung gần đây</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Draft", draftPosts],
                  ["Scheduled", scheduledPosts],
                  ["Published", publishedPosts],
                ].map(([label, count]) => (
                  <span key={label} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {label}: {count}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              {posts.map((post) => {
                const warnings = parseWarnings(post.safetyWarnings);

                return (
                  <article key={post.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-4xl">
                        <p className="font-semibold text-slate-950">{post.title}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{post.message}</p>
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
              {posts.length === 0 && <p className="text-sm text-slate-500">Chưa có bài đăng.</p>}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Audit log</p>
                <h2 className="mt-2 text-2xl font-semibold">Dòng thời gian vận hành</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{auditLogs.length} events</span>
            </div>
            <div className="mt-5 grid gap-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mt-1 size-3 shrink-0 rounded-full bg-blue-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{log.action.toLowerCase().replaceAll("_", " ")}</p>
                      <p className="text-xs text-slate-500">{log.createdAt.toLocaleString("vi-VN")}</p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{log.message}</p>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && <p className="text-sm text-slate-500">Chưa có log.</p>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
