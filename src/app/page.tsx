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

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-300">Fanpage Manager MVP</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
              Quản lý nhiều Facebook account, nhiều fanpage và lịch đăng an toàn.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Dashboard này tập trung vào MVP đăng bài/lập lịch: quản lý account, fanpage, post targets, publish queue,
              audit log và safety guard để hạn chế rủi ro spam theo hướng tuân thủ Meta.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Facebook accounts", accounts.length],
              ["Fanpages", pages.length],
              ["Scheduled posts", scheduledPosts],
              ["Published posts", publishedPosts],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm text-slate-300">{label}</p>
                <p className="mt-2 text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <PostComposer pages={pages} />

          <aside className="grid gap-6">
            <AccountPageManager accounts={accounts} />

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Connected accounts</h2>
              <div className="mt-4 grid gap-3">
                {accounts.map((account) => (
                  <div key={account.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold">{account.name}</p>
                    <p className="text-sm text-slate-500">
                      {account.pages.length} fanpage · {account.status.toLowerCase()}
                    </p>
                  </div>
                ))}
                {accounts.length === 0 && <p className="text-sm text-slate-500">Chưa có account. Chạy seed để có dữ liệu demo.</p>}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Safety guard</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>Giới hạn giờ: {workspace.hourlyPostLimit} post targets/giờ</p>
                <p>Giới hạn ngày: {workspace.dailyPostLimit} post targets/ngày</p>
                <p>Chặn tự động khi safety score từ 70 trở lên.</p>
                <p>Mock publish không gọi Meta API thật cho tới khi cấu hình live mode.</p>
              </div>
            </section>
          </aside>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Fanpages</h2>
            <div className="mt-4 grid gap-3">
              {pages.map((page) => (
                <div key={page.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                  <div>
                    <p className="font-semibold">{page.name}</p>
                    <p className="text-sm text-slate-500">
                      {page.account.name} · {page.category ?? "Fanpage"}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                    {page.status.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Publish queue</h2>
            <div className="mt-4 grid gap-3">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{job.post.title}</p>
                      <p className="text-sm text-slate-500">{job.page.name}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {job.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{job.runAt.toLocaleString("vi-VN")}</p>
                </div>
              ))}
              {jobs.length === 0 && <p className="text-sm text-slate-500">Chưa có job đăng bài.</p>}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Recent posts</h2>
          <div className="mt-4 grid gap-4">
            {posts.map((post) => {
              const warnings = parseWarnings(post.safetyWarnings);

              return (
                <article key={post.id} className="rounded-2xl border border-slate-100 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{post.title}</p>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{post.message}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {post.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.targets.map((target) => (
                      <span key={target.id} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {target.page.name}: {target.status.toLowerCase()}
                      </span>
                    ))}
                  </div>
                  {warnings.length > 0 && (
                    <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="font-semibold">Safety score {post.safetyScore}</p>
                      <ul className="mt-1 list-disc pl-5">
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

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Audit log</h2>
          <div className="mt-4 grid gap-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{log.action.toLowerCase().replaceAll("_", " ")}</p>
                  <p className="text-xs text-slate-500">{log.createdAt.toLocaleString("vi-VN")}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600">{log.message}</p>
              </div>
            ))}
            {auditLogs.length === 0 && <p className="text-sm text-slate-500">Chưa có log.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
