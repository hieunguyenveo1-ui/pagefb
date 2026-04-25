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
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Quản lý account & fanpage</h2>
      <p className="mt-2 text-sm text-slate-500">
        Form demo tạo dữ liệu mock. Production sẽ thay bằng Facebook OAuth và sync Pages API.
      </p>

      <div className="mt-5 grid gap-5">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="font-semibold">Thêm Facebook account</p>
          <div className="mt-3 grid gap-3">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Tên account"
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={facebookUserId}
              onChange={(event) => setFacebookUserId(event.target.value)}
              placeholder="Facebook user id, ví dụ fb-user-004"
            />
            <button
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={isPending}
              onClick={createAccount}
            >
              Thêm account mock
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="font-semibold">Thêm fanpage</p>
          <div className="mt-3 grid gap-3">
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={pageName}
              onChange={(event) => setPageName(event.target.value)}
              placeholder="Tên fanpage"
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={facebookPageId}
              onChange={(event) => setFacebookPageId(event.target.value)}
              placeholder="Facebook page id, ví dụ page-004"
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Category"
            />
            <button
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={isPending || !accountId}
              onClick={createPage}
            >
              Thêm fanpage mock
            </button>
          </div>
        </div>
      </div>

      {message && <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
    </section>
  );
}
