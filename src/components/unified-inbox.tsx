"use client";

import { useState, useTransition } from "react";
import type { Conversation, FacebookPage, InboxMessage } from "@prisma/client";

type ConversationWithData = Conversation & {
  page: FacebookPage;
  messages: InboxMessage[];
};

type UnifiedInboxProps = {
  conversations: ConversationWithData[];
};

type SuggestResult = {
  message?: InboxMessage | string;
};

export function UnifiedInbox({ conversations }: UnifiedInboxProps) {
  const [selectedConversationId, setSelectedConversationId] = useState(conversations[0]?.id ?? "");
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? conversations[0];

  function suggestReply() {
    if (!selectedConversation) {
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/inbox/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedConversation.id }),
      });
      const payload = (await response.json()) as SuggestResult;
      setResult(payload);

      if (response.ok) {
        window.location.reload();
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-emerald-950 px-6 py-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Unified Inbox</p>
        <h2 className="mt-2 text-2xl font-semibold">Tin nhắn, comment và gợi ý trả lời bằng AI</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Meta webhook nhận message/comment vào một inbox chung cho nhiều fanpage, hỗ trợ gợi ý phản hồi trước khi gửi.
        </p>
      </div>

      <div className="grid min-h-[34rem] gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Conversations</p>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {conversations.length} open
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {conversations.map((conversation) => {
              const latestMessage = conversation.messages[0];

              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    selectedConversation?.id === conversation.id
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{conversation.customerName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {conversation.page.name} · {conversation.channel.toLowerCase()}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      P{conversation.priority}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{latestMessage?.body ?? conversation.subject}</p>
                </button>
              );
            })}
            {conversations.length === 0 && <p className="text-sm text-slate-500">Chưa có hội thoại.</p>}
          </div>
        </div>

        <div className="flex min-h-0 flex-col p-5">
          {selectedConversation ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{selectedConversation.page.name}</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-950">{selectedConversation.subject}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedConversation.customerName} · {selectedConversation.status.toLowerCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={suggestReply}
                  disabled={isPending}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Gợi ý trả lời AI
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                {selectedConversation.messages
                  .slice()
                  .reverse()
                  .map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[88%] rounded-3xl px-5 py-4 text-sm leading-7 ${
                        message.direction === "INBOUND"
                          ? "justify-self-start bg-slate-100 text-slate-700"
                          : message.direction === "AI_SUGGESTION"
                            ? "justify-self-end border border-violet-200 bg-violet-50 text-violet-900"
                            : "justify-self-end bg-emerald-600 text-white"
                      }`}
                    >
                      <p>{message.body}</p>
                      <p className="mt-2 text-xs opacity-70">
                        {message.direction.toLowerCase().replaceAll("_", " ")}
                        {message.aiSuggested ? ` · confidence ${message.confidenceScore}%` : ""}
                      </p>
                    </div>
                  ))}
              </div>
              {typeof result?.message === "string" && (
                <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{result.message}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">Chọn một hội thoại để xem chi tiết.</p>
          )}
        </div>
      </div>
    </section>
  );
}
