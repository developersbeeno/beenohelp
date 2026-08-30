import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { useLocale } from "@/lib/i18n/locale-context";
import { useStrings } from "@/lib/i18n/strings";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistente IA — Beeno Help Center" },
      {
        name: "description",
        content: "Tire dúvidas sobre o Beeno CRM com nosso assistente inteligente.",
      },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function AssistantPage() {
  const { locale } = useLocale();
  const s = useStrings(locale);
  const welcome: Msg = { role: "assistant", content: s.chat.welcomeAssistant };
  const [messages, setMessages] = useState<Msg[]>([welcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setMessages((prev) => (prev.length === 1 ? [welcome] : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next
            .filter((m) => m !== welcome || next.indexOf(m) > 0)
            .map((m) => ({ role: m.role, content: m.content })),
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          res.status === 429
            ? s.chat.rateLimitError
            : res.status === 402
              ? s.chat.creditsError
              : data.error || s.chat.genericError;
        setError(msg);
        setMessages((m) => [...m, { role: "assistant", content: ` ${msg}` }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.text || "" }]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : s.chat.networkError;
      setError(msg);
      setMessages((m) => [...m, { role: "assistant", content: ` ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <div className="border border-border rounded-2xl bg-card overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{s.chat.brand}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> {s.chat.online}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick chips */}
        {messages.length <= 2 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {s.chat.quick.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border p-3 flex gap-2 items-end"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={s.chat.placeholder}
            className="flex-1 resize-none px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary max-h-32"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center h-11 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-95 transition disabled:opacity-50"
          >
            <Send className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">{s.chat.send}</span>
          </button>
        </form>
      </div>
      {error && <p className="mt-3 text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
