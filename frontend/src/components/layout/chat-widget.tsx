"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { chatService, type ChatHistoryTurn } from "@/lib/api/services/chat-service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Floating help-assistant widget — mounted once in (dashboard)/layout.tsx
// only (not in the dense POS/KDS screens or the public QR ordering page,
// see chat-widget placement rationale in the approved plan). General Q&A
// only — no access to live app data yet. Conversation history lives in
// local component state only (lost on refresh, acceptable for a v1
// help assistant).
export function ChatWidget() {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatHistoryTurn[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMutation = useMutation({
    mutationFn: (message: string) => chatService.sendMessage(messages, message),
    onSuccess: (reply, message) => {
      setMessages((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: reply }]);
    },
    onError: (_err, message) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: t("error") },
      ]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sendMutation.isPending]);

  function handleSend() {
    const message = input.trim();
    if (!message || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(message);
  }

  return (
    <div className="fixed bottom-4 end-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <Card className="flex h-96 w-80 flex-col overflow-hidden shadow-lg">
          <div className="flex items-center justify-between border-b bg-primary px-3 py-2 text-primary-foreground">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4" />
              {t("title")}
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label={t("close")}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && <p className="text-xs text-muted-foreground">{t("greeting")}</p>}
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-1.5 text-sm",
                  m.role === "user" ? "ms-auto bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {m.content}
              </div>
            ))}
            {sendMutation.isPending && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("thinking")}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t p-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={t("placeholder")}
              disabled={sendMutation.isPending}
              className="h-9"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim() || sendMutation.isPending} onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      <Button
        type="button"
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("title")}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}
