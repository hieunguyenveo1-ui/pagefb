"use client";

import { useState, useTransition } from "react";
import type { ApprovalRequest, FacebookPage, Post, RiskSignal, Workspace } from "@prisma/client";

type ApprovalWithPost = ApprovalRequest & {
  post: Post;
};

type RiskSignalWithData = RiskSignal & {
  page: FacebookPage | null;
  post: Post | null;
};

type RiskDashboardProps = {
  workspace: Workspace;
  pages: FacebookPage[];
  approvals: ApprovalWithPost[];
  riskSignals: RiskSignalWithData[];
};

type ReviewResult = {
  message?: string;
};

function getRiskTone(level: string) {
  if (level === "BLOCKED" || level === "HIGH") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (level === "MEDIUM") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function parseReasons(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function RiskDashboard({ workspace, pages, approvals, riskSignals }: RiskDashboardProps) {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const pendingApprovals = approvals.filter((approval) => approval.status === "PENDING");
  const highSignals = riskSignals.filter((signal) => signal.level === "HIGH" || signal.level === "BLOCKED").length;
  const avgRisk =
    riskSignals.length > 0
      ? Math.round(riskSignals.reduce((total, signal) => total + signal.score, 0) / riskSignals.length)
      : 0;

  function reviewApproval(approvalRequestId: string, decision: "approve" | "reject") {
    setResult(null);
    startTransition(async () => {
      const response = await fetch("/api/approvals/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalRequestId,
          decision,
          reviewNotes: decision === "approve" ? "Đã kiểm duyệt thủ công và cho phép tiếp tục." : "Cần chỉnh nội dung/lịch đăng.",
        }),
      });
      const payload = (await response.json()) as ReviewResult;
      setResult(payload);

      if (response.ok) {
        window.location.reload();
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
      <div className="border-b border-amber-100 bg-gradient-to-r from-slate-950 via-amber-950 to-rose-950 px-6 py-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">Safety & compliance center</p>
        <h2 className="mt-2 text-2xl font-semibold">Risk dashboard và approval workflow</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Theo dõi rate limit workspace/page, similarity check và các nội dung cần duyệt trước khi đăng.
        </p>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Approval threshold", workspace.approvalThreshold, "Tự chuyển review"],
              ["Block threshold", workspace.blockThreshold, "Không publish trực tiếp"],
              ["Avg risk signal", avgRisk, "Tín hiệu gần đây"],
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
                <p className="mt-2 text-xs text-slate-500">{hint}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Page rate limits</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Giới hạn theo fanpage</h3>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                {pages.length} page
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {pages.map((page) => (
                <div key={page.id} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{page.name}</p>
                    <p>
                      {page.hourlyPostLimit}/giờ · {page.dailyPostLimit}/ngày
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Risk signals</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Tín hiệu rủi ro gần đây</h3>
              </div>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                {highSignals} high
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {riskSignals.slice(0, 5).map((signal) => (
                <div key={signal.id} className={`rounded-2xl border px-4 py-3 text-sm ${getRiskTone(signal.level)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{signal.category.replaceAll("_", " ")}</p>
                    <span>{signal.level.toLowerCase()} · +{signal.score}</span>
                  </div>
                  <p className="mt-2 leading-6">{signal.message}</p>
                  <p className="mt-2 text-xs opacity-70">{signal.page?.name ?? signal.post?.title ?? "Workspace"}</p>
                </div>
              ))}
              {riskSignals.length === 0 && <p className="text-sm text-slate-500">Chưa có risk signal.</p>}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Approval workflow</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Nội dung cần duyệt</h3>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              {pendingApprovals.length} pending
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            {pendingApprovals.map((approval) => {
              const reasons = parseReasons(approval.reasons);

              return (
                <article key={approval.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <p className="font-semibold text-slate-950">{approval.post.title}</p>
                      <p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-600">{approval.post.message}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskTone(approval.riskLevel)}`}>
                      {approval.riskLevel.toLowerCase()} · {approval.riskScore}
                    </span>
                  </div>
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-semibold">Lý do cần duyệt</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => reviewApproval(approval.id, "approve")}
                      disabled={isPending}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Duyệt tiếp tục
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewApproval(approval.id, "reject")}
                      disabled={isPending}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      Từ chối
                    </button>
                  </div>
                </article>
              );
            })}
            {pendingApprovals.length === 0 && <p className="text-sm text-slate-500">Không có nội dung chờ duyệt.</p>}
            {result?.message && <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{result.message}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
