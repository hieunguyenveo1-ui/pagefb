"use client";

import { useMemo, useState, useTransition } from "react";
import type { FacebookPage } from "@prisma/client";

type ComposerProps = {
  pages: FacebookPage[];
};

type ApiResult = {
  message?: string;
  safety?: {
    score: number;
    warnings: string[];
  };
};

export function PostComposer({ pages }: ComposerProps) {
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(pages.map((page) => page.id));
  const [title, setTitle] = useState("Chiến dịch ra mắt sản phẩm mới");
  const [message, setMessage] = useState(
    "Khám phá giải pháp mới giúp doanh nghiệp tối ưu chăm sóc khách hàng và tăng trưởng nội dung bền vững.",
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPages = useMemo(
    () => pages.filter((page) => selectedPageIds.includes(page.id)),
    [pages, selectedPageIds],
  );

  function togglePage(pageId: string) {
    setSelectedPageIds((current) =>
      current.includes(pageId) ? current.filter((id) => id !== pageId) : [...current, pageId],
    );
  }

  function submit(action: "draft" | "schedule" | "publish") {
    setResult(null);
    startTransition(async () => {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          message,
          scheduledAt: action === "schedule" ? new Date(scheduledAt).toISOString() : "",
          pageIds: selectedPageIds,
          action,
        }),
      });

      const payload = (await response.json()) as ApiResult;
      setResult(response.ok ? { ...payload, message: "Đã lưu chiến dịch đăng bài." } : payload);

      if (response.ok) {
        window.location.reload();
      }
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Post composer</p>
        <h2 className="text-2xl font-semibold text-slate-950">Soạn bài và chọn nhiều fanpage</h2>
        <p className="text-sm text-slate-500">
          MVP đang chạy mock publish mode. Khi có Meta App, đổi `PUBLISH_MODE=live` và cấu hình token.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Tiêu đề nội bộ
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Nội dung bài đăng
          <textarea
            className="min-h-36 rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Lịch đăng
          <input
            type="datetime-local"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-blue-500"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-slate-800">Fanpage mục tiêu ({selectedPages.length})</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <label
              key={page.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300"
            >
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={selectedPageIds.includes(page.id)}
                onChange={() => togglePage(page.id)}
              />
              <span>
                <span className="block font-semibold text-slate-950">{page.name}</span>
                <span className="text-sm text-slate-500">
                  {page.category ?? "Fanpage"} · {page.followersCount.toLocaleString("vi-VN")} followers
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {result && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{result.message}</p>
          {result.safety && result.safety.warnings.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {result.safety.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          disabled={isPending || selectedPageIds.length === 0}
          onClick={() => submit("draft")}
        >
          Lưu draft
        </button>
        <button
          className="rounded-full bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          disabled={isPending || selectedPageIds.length === 0 || !scheduledAt}
          onClick={() => submit("schedule")}
        >
          Lên lịch
        </button>
        <button
          className="rounded-full bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          disabled={isPending || selectedPageIds.length === 0}
          onClick={() => submit("publish")}
        >
          Đăng ngay mock
        </button>
      </div>
    </section>
  );
}
