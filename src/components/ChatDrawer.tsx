import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Mic, Square } from "lucide-react";
import { Markdown } from "@/components/Markdown";

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Olá! Eu sou o **Beeno**. Posso te ajudar com dúvidas sobre o CRM, integrações e automações. Como posso ajudar?\n\nSe precisar de suporte humano, clique em **Falar com suporte** no topo da página.",
};

const QUICK = [
  "Como criar um contato?",
  "Como funciona a distribuição de leads?",
  "Como configurar uma automação?",
  "Como criar um filtro de busca?",
];

export function ChatDrawer({
  externalOpen,
  onExternalOpenHandled,
}: {
  externalOpen?: boolean;
  onExternalOpenHandled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (externalOpen) {
      setOpen(true);
      onExternalOpenHandled?.();
    }
  }, [externalOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string, audioBlob?: Blob) => {
    const q = text.trim();
    if ((!q && !audioBlob) || loading) return;

    const userMsg: Msg = { role: "user", content: q || "🎤 Mensagem de voz" };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      let body: BodyInit;
      const headers: Record<string, string> = {};

      if (audioBlob) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((res) => {
          reader.onload = () => res((reader.result as string).split(",")[1]);
          reader.readAsDataURL(audioBlob);
        });
        body = JSON.stringify({
          audio_base64: base64,
          audio_mime: audioBlob.type || "audio/webm",
          history: next
            .filter((m) => m !== WELCOME)
            .slice(0, -1)
            .map((m) => ({ role: m.role, content: m.content })),
        });
        headers["content-type"] = "application/json";
      } else {
        body = JSON.stringify({
          messages: next
            .filter((m) => m !== WELCOME)
            .map((m) => ({ role: m.role, content: m.content })),
        });
        headers["content-type"] = "application/json";
      }

      const res = await fetch("/api/chat", { method: "POST", headers, body });
      const data = await res.json();
      const reply: Msg = {
        role: "assistant",
        content: res.ok ? data.text || "" : data.error || "Erro ao consultar o assistente.",
      };
      setMessages((m) => [...m, reply]);
      if (!open) setUnread((n) => n + 1);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Erro de rede. Tente novamente." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        send("", blob);
        setRecordingSecs(0);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setRecordingSecs(0);
      timerRef.current = setInterval(() => setRecordingSecs((s) => s + 1), 1000);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Não foi possível acessar o microfone. Por favor, verifique as permissões ou digite sua pergunta.",
        },
      ]);
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  };

  const fmtSecs = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full z-50 flex flex-col bg-background border-l border-border shadow-2xl transition-all duration-300 ease-in-out
          ${open ? "w-full sm:w-[420px] translate-x-0" : "w-0 translate-x-full overflow-hidden"}`}
      >
        {open && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0">
              <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-primary font-extrabold text-sm tracking-tight">b</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">Beeno</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Online — assistente de ajuda
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground"
                aria-label="Fechar chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] px-4 py-2.5 text-sm leading-relaxed
                      ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                          : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                      }`}
                  >
                    {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick chips */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted hover:border-primary/40 transition disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input area */}
            <div className="border-t border-border p-3 shrink-0">
              {recording ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-sm font-mono text-red-600 dark:text-red-400 flex-1">
                    {fmtSecs(recordingSecs)}
                  </span>
                  <span className="text-xs text-red-500 dark:text-red-400">Gravando...</span>
                  <button
                    onClick={stopRecording}
                    className="h-9 w-9 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shrink-0"
                    aria-label="Parar gravação"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 items-end">
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
                    disabled={loading}
                    style={{ resize: "none" }}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary max-h-28 transition overflow-auto"
                  />
                  <button
                    onClick={startRecording}
                    disabled={loading}
                    className="h-10 w-10 rounded-xl border border-border bg-background text-muted-foreground flex items-center justify-center hover:bg-muted hover:text-foreground transition disabled:opacity-50 shrink-0"
                    aria-label="Gravar áudio"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => send(input)}
                    disabled={loading || !input.trim()}
                    className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-95 transition disabled:opacity-50 shrink-0"
                    aria-label="Enviar"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:brightness-95 transition-all duration-200 flex items-center justify-center
          ${open ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"}`}
        aria-label="Abrir assistente Beeno"
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
