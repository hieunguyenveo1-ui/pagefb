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
    <section className="overflow-hidden apple-glass rounded-[2.25rem]">
      <div className="border-b border-black/[0.05] bg-white/35 px-6 py-5">
        <p className="apple-eyebrow">Unified Inbox</p>
        <h2 className="mt-2 text-2xl font-semibold">Tin nhắn, comment và gợi ý trả lời bằng AI</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6e6e73]">
          Meta webhook nhận message/comment vào một inbox chung cho nhiều fanpage, hỗ trợ gợi ý phản hồi trước khi gửi.
        </p>
      </div>

      <div className="grid min-h-[34rem] gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-black/[0.05] p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <p className="apple-eyebrow">Conversations</p>
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
                  className={`rounded-[1.75rem] border p-4 text-left transition ${
                    selectedConversation?.id === conversation.id
                      ? "border-emerald-400/30 bg-emerald-50/80 shadow-sm"
                      : "border-black/[0.07] bg-white/64 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1d1d1f]">{conversation.customerName}</p>
                      <p className="mt-1 text-sm text-[#86868b]">
                        {conversation.page.name} · {conversation.channel.toLowerCase()}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6e6e73]">
                      P{conversation.priority}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6e6e73]">{latestMessage?.body ?? conversation.subject}</p>
                </button>
              );
            })}
            {conversations.length === 0 && <p className="text-sm text-[#86868b]">Chưa có hội thoại.</p>}
          </div>
        </div>

        <div className="flex min-h-0 flex-col p-5">
          {selectedConversation ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.05] pb-4">
                <div>
                  <p className="text-sm font-semibold text-[#86868b]">{selectedConversation.page.name}</p>
                  <h3 className="mt-1 text-2xl font-semibold text-[#1d1d1f]">{selectedConversation.subject}</h3>
                  <p className="mt-1 text-sm text-[#86868b]">
                    {selectedConversation.customerName} · {selectedConversation.status.toLowerCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={suggestReply}
                  disabled={isPending}
                  className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                      className={`max-w-[88%] rounded-[1.75rem] px-5 py-4 text-sm leading-7 ${
                        message.direction === "INBOUND"
                          ? "justify-self-start bg-black/[0.04] text-[#424245]"
                          : message.direction === "AI_SUGGESTION"
                            ? "justify-self-end border border-[#0071e3]/20 bg-[#0071e3]/10 text-[#1d1d1f]"
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
                <p className="mt-4 rounded-2xl bg-black/[0.04] px-4 py-3 text-sm text-[#424245]">{result.message}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#86868b]">Chọn một hội thoại để xem chi tiết.</p>
          )}
        </div>
      </div>
    </section>
  );
}
