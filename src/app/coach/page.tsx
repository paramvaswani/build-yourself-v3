"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "coach-chat-v1";

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages(JSON.parse(raw) as ChatMessage[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const json = (await res.json()) as { content?: string; error?: string };
      if (json.error) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `Error: ${json.error}`,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: json.content ?? "" },
        ]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "network error";
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${message}` },
      ]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function newChat() {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-12 flex flex-col min-h-0">
      <header className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em]"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft size={14} />
          <span>Dashboard</span>
        </Link>
        <h1
          className="text-xs font-mono uppercase tracking-[0.3em]"
          style={{ color: "var(--muted)" }}
        >
          Coach
        </h1>
        <button
          onClick={newChat}
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em]"
          style={{ color: "var(--muted)" }}
        >
          <Plus size={14} />
          <span>New</span>
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 pb-6"
        style={{ minHeight: 300 }}
      >
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="pt-12 text-center"
          >
            <p
              className="text-sm"
              style={{
                color: "var(--muted)",
                fontFamily: "var(--font-geist-sans), serif",
                fontStyle: "italic",
              }}
            >
              Ask about your day, your data, or what to do next.
            </p>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "user" ? (
                <div
                  className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid #222",
                    color: "var(--foreground)",
                  }}
                >
                  {m.content}
                </div>
              ) : (
                <div
                  className="max-w-[85%] text-[15px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    color: "var(--foreground)",
                    fontFamily: "var(--font-geist-sans), Georgia, serif",
                  }}
                >
                  {m.content}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {sending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-mono"
            style={{ color: "var(--muted)" }}
          >
            thinking...
          </motion.div>
        )}
      </div>

      <div
        className="sticky bottom-0 pt-4"
        style={{ background: "var(--background)" }}
      >
        <div
          className="flex items-end gap-2 rounded-xl border px-3 py-2"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message the coach. Enter to send, Shift+Enter for newline."
            disabled={sending}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm py-1.5 px-1 min-h-[28px] max-h-40"
            style={{ color: "var(--foreground)" }}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="text-xs font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg"
            style={{
              background:
                sending || !input.trim() ? "var(--elevated)" : "var(--accent)",
              color: sending || !input.trim() ? "var(--muted)" : "#0c0c0c",
              cursor: sending || !input.trim() ? "not-allowed" : "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
