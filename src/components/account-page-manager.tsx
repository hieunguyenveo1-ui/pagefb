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
    <section className="overflow-hidden apple-glass rounded-[2.25rem]">
      <div className="border-b border-black/[0.05] px-6 py-5">
        <h2 className="text-xl font-semibold text-[#1d1d1f]">Quản lý account & fanpage</h2>
        <p className="mt-2 text-sm text-[#86868b]">
          Form demo cho sales/CS hoặc operator onboarding nhanh. Production sẽ thay bằng Facebook OAuth và sync Pages API.
        </p>
      </div>

      <div className="grid gap-5 p-6">
        <div className="rounded-[1.75rem] border border-black/[0.07] bg-white/64 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-[#1d1d1f]">Thêm Facebook account</p>
              <p className="mt-1 text-sm text-[#86868b]">Tạo account mock để demo flow kết nối nhiều tài khoản.</p>
            </div>
            <span className="rounded-full bg-[#1d1d1f] px-3 py-1 text-xs font-semibold text-white">Step 1</span>
          </div>
          <div className="mt-4 grid gap-3">
            <input
              className="apple-input rounded-2xl px-4 py-3 text-sm outline-none transition"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Tên account"
            />
            <input
              className="apple-input rounded-2xl px-4 py-3 text-sm outline-none transition"
              value={facebookUserId}
              onChange={(event) => setFacebookUserId(event.target.value)}
              placeholder="Facebook user id, ví dụ fb-user-004"
            />
            <button
              className="rounded-full bg-[#1d1d1f] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#424245] disabled:opacity-50"
              disabled={isPending}
              onClick={createAccount}
            >
              Thêm account mock
            </button>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-black/[0.07] bg-white/64 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-[#1d1d1f]">Thêm fanpage</p>
              <p className="mt-1 text-sm text-[#86868b]">Gắn fanpage vào account để chạy chiến dịch đa kênh.</p>
            </div>
            <span className="rounded-full bg-[#0071e3] px-3 py-1 text-xs font-semibold text-white">Step 2</span>
          </div>
          <div className="mt-4 grid gap-3">
            <select
              className="apple-input rounded-2xl px-4 py-3 text-sm outline-none transition"
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
              className="apple-input rounded-2xl px-4 py-3 text-sm outline-none transition"
              value={pageName}
              onChange={(event) => setPageName(event.target.value)}
              placeholder="Tên fanpage"
            />
            <input
              className="apple-input rounded-2xl px-4 py-3 text-sm outline-none transition"
              value={facebookPageId}
              onChange={(event) => setFacebookPageId(event.target.value)}
              placeholder="Facebook page id, ví dụ page-004"
            />
            <input
              className="apple-input rounded-2xl px-4 py-3 text-sm outline-none transition"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Category"
            />
            <button
              className="rounded-full bg-[#0071e3] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
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
