import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";
import { Markdown } from "@/components/Markdown";

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

const QUICK = [
  "Como criar um contato?",
  "Como funciona a distribuição de leads?",
  "Como configurar fluxos de automação?",
  "Como criar um filtro de busca?",
];

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Olá! Eu sou o **Beeno**. Posso te ajudar com dúvidas sobre o CRM, integrações e automações. Como posso ajudar?",
};

function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
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
            .filter((m) => m !== WELCOME || next.indexOf(m) > 0)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          res.status === 429
            ? "Limite de requisições atingido. Tente novamente em alguns instantes."
            : res.status === 402
              ? "Créditos de IA esgotados. Entre em contato com o administrador."
              : data.error || "Erro ao consultar o assistente.";
        setError(msg);
        setMessages((m) => [...m, { role: "assistant", content: ` ${msg}` }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.text || "" }]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro de rede";
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
            <div className="font-semibold">Beeno</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Online
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
            {QUICK.map((q) => (
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
            placeholder="Escreva sua pergunta..."
            className="flex-1 resize-none px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary max-h-32"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center h-11 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-95 transition disabled:opacity-50"
          >
            <Send className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
      {error && <p className="mt-3 text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
