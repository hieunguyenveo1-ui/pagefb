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
    <section id="composer" className="overflow-hidden apple-glass rounded-[2.25rem]">
      <div className="border-b border-black/[0.05] bg-white/35 px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-1">
            <p className="apple-eyebrow">Campaign composer</p>
            <h2 className="text-2xl font-semibold">Soạn bài và điều phối nhiều fanpage</h2>
            <p className="max-w-2xl text-sm text-[#6e6e73]">
              Thiết kế theo luồng marketing team: viết nội dung, chọn kênh, kiểm tra rủi ro rồi mới đưa vào lịch đăng.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm lg:min-w-72">
            <div className="rounded-2xl border border-black/[0.06] bg-white/60 px-4 py-3 shadow-sm">
              <p className="text-[#6e6e73]">Đã chọn</p>
              <p className="mt-1 text-lg font-semibold">{selectedPages.length} fanpage</p>
            </div>
            <div className="rounded-2xl border border-black/[0.06] bg-white/60 px-4 py-3 shadow-sm">
              <p className="text-[#6e6e73]">Publish mode</p>
              <p className="mt-1 text-lg font-semibold uppercase">{process.env.NEXT_PUBLIC_PUBLISH_MODE ?? "mock"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 grid gap-3 lg:grid-cols-3">
          {[
            "Tối ưu cho agency/team vận hành nhiều page",
            "Cảnh báo rủi ro trước khi schedule hàng loạt",
            "Sẵn sàng nâng cấp sang AI assistant và approval flow",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-black/[0.07] bg-white/64 px-4 py-3 text-sm text-[#6e6e73]">
              {item}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <p className="apple-eyebrow">Post composer</p>
          <h3 className="text-2xl font-semibold text-[#1d1d1f]">Soạn bài và chọn nhiều fanpage</h3>
          <p className="text-sm text-[#86868b]">
            MVP đang chạy mock publish mode. Khi có Meta App, đổi `PUBLISH_MODE=live` và cấu hình token.
          </p>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-[#424245]">
              Tiêu đề nội bộ
              <input
                className="apple-input rounded-2xl px-4 py-3 text-[#1d1d1f] outline-none transition"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ví dụ: Campaign tháng 5 cho nhóm fanpage bán hàng"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#424245]">
              Nội dung bài đăng
              <textarea
                className="apple-input min-h-44 rounded-2xl px-4 py-3 text-[#1d1d1f] outline-none transition"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Nhập caption/copy chính cho chiến dịch..."
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#424245]">
              Lịch đăng
              <input
                type="datetime-local"
                className="apple-input rounded-2xl px-4 py-3 text-[#1d1d1f] outline-none transition"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>

            <div className="rounded-2xl border border-black/[0.07] bg-black/[0.025] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1d1d1f]">Fanpage mục tiêu</p>
                  <p className="text-sm text-[#86868b]">Chọn các kênh cần phân phối cho chiến dịch này.</p>
                </div>
                <span className="rounded-full bg-[#0071e3] px-3 py-1 text-xs font-semibold text-white">
                  {selectedPages.length} fanpage
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {pages.map((page) => {
                  const selected = selectedPageIds.includes(page.id);

                  return (
                    <label
                      key={page.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                        selected
                          ? "border-[#0071e3] bg-[#0071e3]/10 shadow-[0_18px_36px_-28px_rgba(0,113,227,0.8)]"
                          : "border-black/[0.07] bg-white hover:border-[#0071e3]/35"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-[#0071e3]"
                        checked={selected}
                        onChange={() => togglePage(page.id)}
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-[#1d1d1f]">{page.name}</span>
                        <span className="mt-1 block text-sm text-[#86868b]">
                          {page.category ?? "Fanpage"} · {page.followersCount.toLocaleString("vi-VN")} followers
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-black/[0.07] bg-[#1d1d1f] p-5 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Preview</p>
              <p className="mt-4 text-lg font-semibold">{title || "Chưa có tiêu đề"}</p>
              <p className="mt-3 text-sm leading-7 text-white/68">{message || "Nội dung bài đăng sẽ hiển thị ở đây."}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {selectedPages.slice(0, 4).map((page) => (
                  <span key={page.id} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    {page.name}
                  </span>
                ))}
                {selectedPages.length > 4 && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    +{selectedPages.length - 4} fanpage
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-black/[0.07] bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#86868b]">Checklist</p>
              <ul className="mt-4 space-y-3 text-sm text-[#6e6e73]">
                <li className="rounded-2xl bg-black/[0.025] px-4 py-3">Tùy biến nhẹ nội dung nếu đăng trên nhiều page cùng lúc.</li>
                <li className="rounded-2xl bg-black/[0.025] px-4 py-3">Ưu tiên schedule thay vì publish hàng loạt tức thời.</li>
                <li className="rounded-2xl bg-black/[0.025] px-4 py-3">Kiểm tra safety warning trước khi đưa chiến dịch vào queue.</li>
              </ul>
            </div>
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
            className="rounded-full border border-black/[0.08] bg-white/75 px-5 py-3 font-semibold text-[#424245] shadow-sm transition hover:bg-white disabled:opacity-50"
            disabled={isPending || selectedPageIds.length === 0}
            onClick={() => submit("draft")}
          >
            Lưu draft
          </button>
          <button
            className="apple-primary rounded-full px-5 py-3 font-semibold text-white transition disabled:opacity-50"
            disabled={isPending || selectedPageIds.length === 0 || !scheduledAt}
            onClick={() => submit("schedule")}
          >
            Lên lịch chiến dịch
          </button>
          <button
            className="rounded-full bg-[#1d1d1f] px-5 py-3 font-semibold text-white transition hover:bg-[#424245] disabled:opacity-50"
            disabled={isPending || selectedPageIds.length === 0}
            onClick={() => submit("publish")}
          >
            Đăng ngay mock
          </button>
        </div>
      </div>
    </section>
  );
}
