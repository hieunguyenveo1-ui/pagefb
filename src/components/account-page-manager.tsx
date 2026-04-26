"use client";

import { useState, useTransition } from "react";
import type { FacebookAccount } from "@prisma/client";

type AccountPageManagerProps = {
  accounts: FacebookAccount[];
};

export function AccountPageManager({ accounts }: AccountPageManagerProps) {
  const [accountName, setAccountName] = useState("Facebook Business Account");
  const [facebookUserId, setFacebookUserId] = useState("");
  const [pageName, setPageName] = useState("Fanpage mới");
  const [facebookPageId, setFacebookPageId] = useState("");
  const [category, setCategory] = useState("Business");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function createAccount() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountName,
          facebookUserId: facebookUserId || `fb-user-${crypto.randomUUID()}`,
          email: "",
        }),
      });

      if (response.ok) {
        window.location.reload();
        return;
      }

      const payload = (await response.json()) as { message?: string };
      setMessage(payload.message ?? "Không thể tạo account.");
    });
  }

  function createPage() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          name: pageName,
          facebookPageId: facebookPageId || `page-${crypto.randomUUID()}`,
          category,
          followersCount: 0,
        }),
      });

      if (response.ok) {
        window.location.reload();
        return;
      }

      const payload = (await response.json()) as { message?: string };
      setMessage(payload.message ?? "Không thể tạo fanpage.");
    });
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-xl font-semibold text-slate-950">Quản lý account & fanpage</h2>
        <p className="mt-2 text-sm text-slate-500">
          Form demo cho sales/CS hoặc operator onboarding nhanh. Production sẽ thay bằng Facebook OAuth và sync Pages API.
        </p>
      </div>

      <div className="grid gap-5 p-6">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-950">Thêm Facebook account</p>
              <p className="mt-1 text-sm text-slate-500">Tạo account mock để demo flow kết nối nhiều tài khoản.</p>
            </div>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">Step 1</span>
          </div>
          <div className="mt-4 grid gap-3">
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Tên account"
            />
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              value={facebookUserId}
              onChange={(event) => setFacebookUserId(event.target.value)}
              placeholder="Facebook user id, ví dụ fb-user-004"
            />
            <button
              className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              disabled={isPending}
              onClick={createAccount}
            >
              Thêm account mock
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-950">Thêm fanpage</p>
              <p className="mt-1 text-sm text-slate-500">Gắn fanpage vào account để chạy chiến dịch đa kênh.</p>
            </div>
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Step 2</span>
          </div>
          <div className="mt-4 grid gap-3">
            <select
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              value={pageName}
              onChange={(event) => setPageName(event.target.value)}
              placeholder="Tên fanpage"
            />
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              value={facebookPageId}
              onChange={(event) => setFacebookPageId(event.target.value)}
              placeholder="Facebook page id, ví dụ page-004"
            />
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Category"
            />
            <button
              className="rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              disabled={isPending || !accountId}
              onClick={createPage}
            >
              Thêm fanpage mock
            </button>
          </div>
        </div>
      </div>

      {message && <p className="mx-6 mb-6 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
    </section>
  );
}
