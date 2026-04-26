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
    <section id="ai-studio" className="overflow-hidden apple-glass rounded-[2.25rem]">
      <div className="border-b border-black/[0.05] bg-white/35 px-6 py-5">
        <p className="apple-eyebrow">AI Studio</p>
        <h2 className="mt-2 text-2xl font-semibold">Sinh nội dung và duyệt trước khi đăng</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">
          Cấu hình provider theo workspace, dùng prompt template để tạo caption, hashtag, biến thể rồi chuyển qua bước review.
        </p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[#424245]">
              AI provider
              <select
                value={providerId}
                onChange={(event) => setProviderId(event.target.value)}
                className="apple-input rounded-2xl px-4 py-3 text-[#1d1d1f] outline-none transition"
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} · {provider.model}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#424245]">
              Prompt template
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                className="apple-input rounded-2xl px-4 py-3 text-[#1d1d1f] outline-none transition"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-[#424245]">
            Chủ đề chiến dịch
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="apple-input rounded-2xl px-4 py-3 text-[#1d1d1f] outline-none transition"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#424245]">
            Khách hàng mục tiêu
            <input
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              className="apple-input rounded-2xl px-4 py-3 text-[#1d1d1f] outline-none transition"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#424245]">
            Ưu đãi/CTA
            <input
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              className="apple-input rounded-2xl px-4 py-3 text-[#1d1d1f] outline-none transition"
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-[#424245]">Fanpage dùng để kiểm tra safety</p>
            <div className="mt-3 grid gap-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => togglePage(page.id)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedPageIds.includes(page.id)
                      ? "border-[#0071e3]/35 bg-[#0071e3]/10 text-[#0066cc]"
                      : "border-black/[0.07] bg-black/[0.025] text-[#6e6e73]"
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
              className="apple-primary rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sinh caption/hashtag
            </button>
            <button
              type="button"
              onClick={() => approve("draft")}
              disabled={isPending || !latestGeneration || selectedPageIds.length === 0}
              className="rounded-full border border-black/[0.08] bg-white/75 px-5 py-3 text-sm font-semibold text-[#424245] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:text-[#6e6e73]"
            >
              Duyệt thành draft
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-black/[0.07] bg-white/64 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="apple-eyebrow">Review queue</p>
              <h3 className="mt-2 text-xl font-semibold text-[#1d1d1f]">{latestGeneration?.topic ?? "Chưa có nội dung AI"}</h3>
            </div>
            <span className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-semibold text-[#0066cc]">
              {reviewGenerations.length} chờ duyệt
            </span>
          </div>

          {latestGeneration ? (
            <div className="mt-5 grid gap-4">
              <div className="rounded-[1.75rem] bg-white p-4 text-sm leading-7 text-[#424245] shadow-sm">
                {latestGeneration.caption}
              </div>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((hashtag) => (
                  <span key={hashtag} className="rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-semibold text-[#0066cc]">
                    {hashtag}
                  </span>
                ))}
              </div>
              <div className="grid gap-2">
                {variants.map((variant, index) => (
                  <div key={variant} className="rounded-2xl border border-black/[0.07] bg-white px-4 py-3 text-sm text-[#6e6e73]">
                    <span className="font-semibold text-[#1d1d1f]">Biến thể {index + 1}: </span>
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
              <div className="grid gap-3 rounded-[1.75rem] border border-black/[0.07] bg-white p-4">
                <label className="grid gap-2 text-sm font-semibold text-[#424245]">
                  Lịch đăng sau khi duyệt
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="apple-input rounded-2xl px-4 py-3 text-[#1d1d1f] outline-none transition"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => approve("schedule")}
                  disabled={isPending || !scheduledAt || selectedPageIds.length === 0}
                  className="rounded-full bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#424245] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Duyệt và đưa vào lịch
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-[#86868b]">Tạo nội dung mới để bắt đầu review workflow.</p>
          )}

          {result?.message && <p className="mt-4 rounded-2xl bg-black/[0.04] px-4 py-3 text-sm text-[#424245]">{result.message}</p>}
        </div>
      </div>
    </section>
  );
}
