"use client";

import { useMemo, useState, useTransition } from "react";
import type { AiGeneration, AiProvider, FacebookPage, PromptTemplate } from "@prisma/client";

type AiStudioProps = {
  providers: AiProvider[];
  templates: PromptTemplate[];
  generations: AiGeneration[];
  pages: FacebookPage[];
};

type GenerateResult = {
  generation?: AiGeneration;
  safety?: {
    score: number;
    warnings: string[];
  };
  message?: string;
};

function parseList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function AiStudio({ providers, templates, generations, pages }: AiStudioProps) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [topic, setTopic] = useState("Ra mắt dịch vụ quản lý fanpage bằng AI");
  const [audience, setAudience] = useState("chủ shop, agency và đội marketing SME");
  const [offer, setOffer] = useState("demo miễn phí quy trình đăng bài và chăm sóc inbox");
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(pages.map((page) => page.id));
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const reviewGenerations = useMemo(
    () => generations.filter((generation) => generation.status === "REVIEW"),
    [generations],
  );
  const latestGeneration = result?.generation ?? reviewGenerations[0] ?? generations[0];
  const variants = latestGeneration ? parseList(latestGeneration.variants) : [];
  const hashtags = latestGeneration ? parseList(latestGeneration.hashtags) : [];

  function togglePage(pageId: string) {
    setSelectedPageIds((current) =>
      current.includes(pageId) ? current.filter((id) => id !== pageId) : [...current, pageId],
    );
  }

  function generate() {
    setResult(null);
    startTransition(async () => {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          templateId,
          topic,
          audience,
          offer,
          pageIds: selectedPageIds,
        }),
      });
      const payload = (await response.json()) as GenerateResult;
      setResult(response.ok ? payload : { message: payload.message ?? "Không thể sinh nội dung." });
    });
  }

  function approve(action: "draft" | "schedule") {
    if (!latestGeneration) {
      setResult({ message: "Chưa có nội dung AI để duyệt." });
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/ai/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: latestGeneration.id,
          pageIds: selectedPageIds,
          scheduledAt: action === "schedule" ? new Date(scheduledAt).toISOString() : "",
          action,
          reviewNotes: "Đã duyệt từ AI Studio.",
        }),
      });
      const payload = (await response.json()) as GenerateResult;
      setResult(response.ok ? { message: "Đã duyệt nội dung và tạo bài đăng." } : payload);

      if (response.ok) {
        window.location.reload();
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-950 via-slate-950 to-blue-950 px-6 py-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-200">AI Studio</p>
        <h2 className="mt-2 text-2xl font-semibold">Sinh nội dung và duyệt trước khi đăng</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Cấu hình provider theo workspace, dùng prompt template để tạo caption, hashtag, biến thể rồi chuyển qua bước review.
        </p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              AI provider
              <select
                value={providerId}
                onChange={(event) => setProviderId(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400"
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} · {provider.model}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Prompt template
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Chủ đề chiến dịch
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Khách hàng mục tiêu
            <input
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Ưu đãi/CTA
            <input
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400"
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-slate-700">Fanpage dùng để kiểm tra safety</p>
            <div className="mt-3 grid gap-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => togglePage(page.id)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedPageIds.includes(page.id)
                      ? "border-violet-300 bg-violet-50 text-violet-800"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {page.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={isPending || !providerId || !templateId}
              className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Sinh caption/hashtag
            </button>
            <button
              type="button"
              onClick={() => approve("draft")}
              disabled={isPending || !latestGeneration || selectedPageIds.length === 0}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Duyệt thành draft
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Review queue</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">{latestGeneration?.topic ?? "Chưa có nội dung AI"}</h3>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              {reviewGenerations.length} chờ duyệt
            </span>
          </div>

          {latestGeneration ? (
            <div className="mt-5 grid gap-4">
              <div className="rounded-3xl bg-white p-4 text-sm leading-7 text-slate-700 shadow-sm">
                {latestGeneration.caption}
              </div>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((hashtag) => (
                  <span key={hashtag} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {hashtag}
                  </span>
                ))}
              </div>
              <div className="grid gap-2">
                {variants.map((variant, index) => (
                  <div key={variant} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">Biến thể {index + 1}: </span>
                    {variant}
                  </div>
                ))}
              </div>
              {result?.safety && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Safety score {result.safety.score}
                  {result.safety.warnings.length > 0 && <span> · {result.safety.warnings.join(", ")}</span>}
                </div>
              )}
              <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Lịch đăng sau khi duyệt
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-violet-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => approve("schedule")}
                  disabled={isPending || !scheduledAt || selectedPageIds.length === 0}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Duyệt và đưa vào lịch
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">Tạo nội dung mới để bắt đầu review workflow.</p>
          )}

          {result?.message && <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{result.message}</p>}
        </div>
      </div>
    </section>
  );
}
