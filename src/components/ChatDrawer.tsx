import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  Send,
  Mic,
  Square,
  Headset,
  Clock,
  ArrowLeft,
  Paperclip,
  Image as ImageIcon,
  File as FileIcon,
} from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { AttachmentList, type Attachment } from "@/components/Attachments";
import { useLocale } from "@/lib/i18n/locale-context";
import { useStrings } from "@/lib/i18n/strings";

type Role = "user" | "assistant" | "agent" | "system";
type Msg = {
  role: Role;
  content: string;
  author?: string | null;
  id?: string;
  attachments?: Attachment[];
};

/**
 * bot          — conversando com a IA
 * form         — preenchendo nome/e-mail para falar com humano
 * waiting      — na fila, aguardando um consultor assumir
 * live         — conversando com um consultor
 * offline_done — deixou recado fora do horário
 * closed       — atendimento encerrado pelo consultor
 */
type Mode = "bot" | "form" | "waiting" | "live" | "offline_done" | "closed";

const CONV_KEY = "beeno_conversation_id";
/** Limite da plataforma serverless — mantenha igual ao MAX_UPLOAD_BYTES do servidor. */
const MAX_UPLOAD_MB = 4;

function getConversationId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(CONV_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CONV_KEY, id);
  }
  return id;
}

export function ChatDrawer({
  externalOpen,
  onExternalOpenHandled,
}: {
  externalOpen?: boolean;
  onExternalOpenHandled?: () => void;
}) {
  const { locale } = useLocale();
  const s = useStrings(locale);
  const welcome: Msg = { role: "assistant", content: s.chat.welcomeDrawer };

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([welcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);

  const [mode, setMode] = useState<Mode>("bot");
  const [hours, setHours] = useState<{ open: boolean; label: string } | null>(null);
  // enquanto o backend de atendimento não estiver configurado, não oferecemos humano
  const [supportEnabled, setSupportEnabled] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", question: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [agentName, setAgentName] = useState<string | null>(null);

  // anexos escolhidos mas ainda não enviados
  const [pending, setPending] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // espelha `pending` para o callback de upload não ler estado velho
  const pendingRef = useRef<Attachment[]>([]);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convIdRef = useRef<string>("");
  const cursorRef = useRef<string | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    convIdRef.current = getConversationId();
    fetch("/api/support/status")
      .then((r) => r.json())
      .then((d: { configured: boolean; open: boolean; label: string }) => {
        setSupportEnabled(Boolean(d.configured));
        setHours({ open: d.open, label: d.label });
      })
      .catch(() => setSupportEnabled(false));
  }, []);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    openRef.current = open;
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
  }, [messages, loading, mode]);

  useEffect(() => {
    setMessages((prev) => (prev.length === 1 ? [welcome] : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const push = useCallback((m: Msg) => {
    setMessages((prev) => [...prev, m]);
    if (!openRef.current) setUnread((n) => n + 1);
  }, []);

  // ------------------------------------------------------------------ anexos
  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setUploadError("");

      const room = 5 - pendingRef.current.length;
      if (room <= 0) return setUploadError(s.handoff.maxFilesError);

      for (const file of files.slice(0, room)) {
        // checagem no cliente: a plataforma corta acima de ~4,5 MB com um erro
        // cru, então avisamos antes de tentar
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
          setUploadError(s.handoff.fileTooBigError(file.name, MAX_UPLOAD_MB));
          continue;
        }
        setUploading((n) => n + 1);
        try {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("conversation_id", convIdRef.current);
          const res = await fetch("/api/support/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) {
            setUploadError(data.error || s.handoff.uploadFailError);
          } else {
            setPending((p) => [...p, data as Attachment]);
          }
        } catch {
          setUploadError(s.handoff.uploadNetworkError);
        } finally {
          setUploading((n) => n - 1);
        }
      }
    },
    [s],
  );

  // Ctrl+V de um print cai aqui
  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = [...(e.clipboardData?.items || [])]
        .filter((i) => i.kind === "file")
        .map((i) => i.getAsFile())
        .filter((f): f is File => Boolean(f));
      if (files.length) {
        e.preventDefault();
        uploadFiles(files);
      }
    },
    [uploadFiles],
  );

  // ---------------------------------------------------------------- polling
  // Enquanto a conversa está com um humano, buscamos novas mensagens do
  // consultor a cada 3s. As mensagens do próprio visitante já estão na tela.
  useEffect(() => {
    if (mode !== "waiting" && mode !== "live") return;

    let cancelled = false;

    const tick = async () => {
      try {
        const params = new URLSearchParams({ conversation_id: convIdRef.current });
        if (cursorRef.current) params.set("after", cursorRef.current);

        const res = await fetch(`/api/support/poll?${params}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          status: Mode | "bot";
          agent_name: string | null;
          messages: { id: string; role: Role; content: string; author_name: string | null; created_at: string }[];
        };
        if (cancelled) return;

        if (data.agent_name) setAgentName(data.agent_name);

        for (const m of data.messages) {
          push({ role: m.role, content: m.content, author: m.author_name, id: m.id });
          cursorRef.current = m.created_at;
        }

        if (data.status === "live" && mode !== "live") setMode("live");
        if (data.status === "closed") setMode("closed");
      } catch {
        /* rede instável: tenta de novo no próximo tick */
      }
    };

    tick();
    const iv = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [mode, push]);

  // ------------------------------------------------------------ envio de msg
  const send = async (text: string, audioBlob?: Blob) => {
    const q = text.trim();
    const files = pending;
    if ((!q && !audioBlob && !files.length) || loading || uploading > 0) return;

    // Modo humano: a mensagem vai direto para o consultor, sem passar pela IA.
    if (mode === "waiting" || mode === "live") {
      setMessages((m) => [
        ...m,
        { role: "user", content: q || s.handoff.filesAttachedLabel(files.length), attachments: files },
      ]);
      setInput("");
      setPending([]);
      try {
        await fetch("/api/support/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            conversation_id: convIdRef.current,
            content: q,
            attachments: files,
          }),
        });
      } catch {
        push({ role: "system", content: s.handoff.sendFailedHuman });
      }
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    const userMsg: Msg = {
      role: "user",
      content: q || (files.length ? s.handoff.filesAttachedLabel(files.length) : s.chat.voiceMessage),
      attachments: files,
    };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setPending([]);
    setLoading(true);

    try {
      const aiHistory = next
        .filter((m) => m !== welcome && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      let body: string;
      if (audioBlob) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((res) => {
          reader.onload = () => res((reader.result as string).split(",")[1]);
          reader.readAsDataURL(audioBlob);
        });
        body = JSON.stringify({
          audio_base64: base64,
          audio_mime: audioBlob.type || "audio/webm",
          history: aiHistory.slice(0, -1),
          conversation_id: convIdRef.current,
          locale,
        });
      } else {
        body = JSON.stringify({
          messages: aiHistory,
          conversation_id: convIdRef.current,
          attachments: files,
          locale,
        });
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      const data = await res.json();

      if (data.handled_by_human) {
        setMode(data.status === "live" ? "live" : "waiting");
        return;
      }

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.ok ? data.text || "" : data.error || s.chat.genericError,
        },
      ]);
      if (!openRef.current) setUnread((n) => n + 1);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: s.chat.networkError }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  // ------------------------------------------------------------- escalonamento
  const openHandoffForm = async () => {
    setFormError("");
    setMode("form");
    try {
      const res = await fetch("/api/support/status");
      if (res.ok) setHours(await res.json());
    } catch {
      /* se falhar, o formulário aparece sem o aviso de horário */
    }
  };

  const submitHandoff = async () => {
    setFormError("");
    if (!form.name.trim()) return setFormError(s.handoff.nameRequired);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()))
      return setFormError(s.handoff.emailInvalid);
    if (hours && !hours.open && !form.question.trim())
      return setFormError(s.handoff.questionRequiredOffline);

    setSubmitting(true);
    try {
      const res = await fetch("/api/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversation_id: convIdRef.current,
          name: form.name.trim(),
          email: form.email.trim(),
          question: form.question.trim(),
          attachments: pending,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || s.handoff.handoffFailed);
        return;
      }

      cursorRef.current = data.cursor ?? null;
      if (form.question.trim() || pending.length) {
        setMessages((m) => [
          ...m,
          {
            role: "user",
            content: form.question.trim() || s.handoff.filesAttachedLabel(pending.length),
            attachments: pending,
          },
        ]);
      }
      setPending([]);
      setMessages((m) => [...m, { role: "system", content: data.message }]);
      setMode(data.mode === "live" ? "waiting" : "offline_done");
    } catch {
      setFormError(s.chat.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    localStorage.removeItem(CONV_KEY);
    convIdRef.current = getConversationId();
    cursorRef.current = null;
    setAgentName(null);
    setMessages([welcome]);
    setMode("bot");
    setForm({ name: "", email: "", question: "" });
  };

  // ------------------------------------------------------------------- áudio
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
        send("", new Blob(chunksRef.current, { type: "audio/webm" }));
        setRecordingSecs(0);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setRecordingSecs(0);
      timerRef.current = setInterval(() => setRecordingSecs((sec) => sec + 1), 1000);
    } catch {
      push({ role: "assistant", content: s.chat.micError });
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  };

  const fmtSecs = (sec: number) =>
    `${Math.floor(sec / 60)
      .toString()
      .padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;

  // ------------------------------------------------------------------ header
  const headerStatus = () => {
    if (mode === "live")
      return { dot: "bg-emerald-500", text: s.handoff.statusLive(agentName || s.handoff.defaultAgentName) };
    if (mode === "waiting") return { dot: "bg-amber-500", text: s.handoff.statusWaiting };
    if (mode === "offline_done") return { dot: "bg-muted-foreground", text: s.handoff.statusOfflineDone };
    if (mode === "closed") return { dot: "bg-muted-foreground", text: s.handoff.statusClosed };
    return { dot: "bg-primary", text: s.chat.onlineHelp };
  };
  const status = headerStatus();

  const canType = mode === "bot" || mode === "waiting" || mode === "live";

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* transition-transform (não -all): o drawer vira camada composta por
          causa do translate, e transições de cor nessa camada fazem o Chrome
          não repintar na troca de tema — o painel ficava com o tema antigo */}
      <div
        className={`fixed top-0 right-0 h-full z-50 flex flex-col bg-background border-l border-border shadow-2xl transition-transform duration-300 ease-in-out
          ${open ? "w-full sm:w-[420px] translate-x-0" : "w-0 translate-x-full overflow-hidden"}`}
      >
        {open && (
          <>
            {/* input de arquivo compartilhado — o formulário e o chat usam o mesmo */}
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                uploadFiles([...(e.target.files || [])]);
                e.target.value = "";
              }}
            />

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0">
              <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                {mode === "live" ? (
                  <Headset className="h-4 w-4 text-primary" />
                ) : (
                  <span className="text-primary font-extrabold text-sm tracking-tight">b</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {mode === "live" ? agentName || s.handoff.defaultAgentNameFull : s.chat.brand}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot} animate-pulse`} />
                  <span className="truncate">{status.text}</span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground"
                aria-label={s.chat.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mensagens */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => {
                // o botão de suporte fica logo abaixo da resposta da IA,
                // onde a dúvida "isso não resolveu" realmente acontece
                const isLastAssistant =
                  m.role === "assistant" &&
                  mode === "bot" &&
                  !loading &&
                  i === messages.length - 1 &&
                  messages.length > 1;

                if (m.role === "system") {
                  return (
                    <div key={m.id ?? i} className="flex justify-center">
                      <div className="max-w-[92%] text-center text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id ?? i}>
                    <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[88%]">
                        {m.role === "agent" && (
                          <div className="text-[11px] font-medium text-primary mb-1 px-1">
                            {m.author || s.handoff.defaultAgentNameFull}
                          </div>
                        )}
                        <div
                          className={`px-4 py-2.5 text-sm leading-relaxed
                            ${
                              m.role === "user"
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                                : m.role === "agent"
                                  ? "bg-primary/10 border border-primary/25 text-foreground rounded-2xl rounded-bl-sm"
                                  : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                            }`}
                        >
                          {m.role === "user" ? m.content : <Markdown>{m.content}</Markdown>}
                        </div>
                        {!!m.attachments?.length && (
                          <AttachmentList
                            items={m.attachments}
                            align={m.role === "user" ? "right" : "left"}
                          />
                        )}
                      </div>
                    </div>

                    {isLastAssistant && (
                      <button
                        onClick={openHandoffForm}
                        className="mt-2 w-full flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition"
                      >
                        <Headset className="h-3.5 w-3.5" />
                        {s.handoff.talkToConsultant}
                      </button>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {mode === "waiting" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-2 items-center text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {s.handoff.searchingConsultant}
                  </div>
                </div>
              )}

              {/* Formulário de atendimento humano */}
              {mode === "form" && (
                <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => setMode("bot")}
                      className="p-1 -ml-1 rounded hover:bg-muted text-muted-foreground shrink-0"
                      aria-label={s.handoff.back}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{s.handoff.title}</div>
                      {hours && (
                        <div
                          className={`mt-1 text-xs flex items-start gap-1.5 ${
                            hours.open ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 mt-px shrink-0" />
                          <span>{hours.open ? s.handoff.onlineNotice : s.handoff.offlineNotice(hours.label)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={s.handoff.namePlaceholder}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    type="email"
                    placeholder={s.handoff.emailPlaceholder}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <textarea
                    value={form.question}
                    onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                    onPaste={onPaste}
                    rows={3}
                    placeholder={
                      hours && !hours.open
                        ? s.handoff.questionPlaceholderRequired
                        : s.handoff.questionPlaceholderOptional
                    }
                    style={{ resize: "none" }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />

                  {/* anexos: num relato de bug o print costuma valer mais que o texto */}
                  {(pending.length > 0 || uploading > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {pending.map((a) => (
                        <div
                          key={a.path}
                          className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg border border-border bg-background text-xs max-w-[170px]"
                        >
                          {a.type.startsWith("image/") ? (
                            <ImageIcon className="h-3 w-3 text-primary shrink-0" />
                          ) : (
                            <FileIcon className="h-3 w-3 text-primary shrink-0" />
                          )}
                          <span className="truncate">{a.name}</span>
                          <button
                            onClick={() => setPending((p) => p.filter((x) => x.path !== a.path))}
                            className="p-0.5 rounded hover:bg-muted shrink-0"
                            aria-label={s.handoff.removeAttachment(a.name)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {uploading > 0 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          {s.handoff.uploading(uploading)}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={pending.length >= 5}
                    className="w-full flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition disabled:opacity-50"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {s.handoff.attachButton}
                  </button>

                  {uploadError && <div className="text-xs text-destructive">{uploadError}</div>}
                  {formError && <div className="text-xs text-destructive">{formError}</div>}

                  <button
                    onClick={submitHandoff}
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-95 transition disabled:opacity-60"
                  >
                    {submitting
                      ? s.handoff.submitSending
                      : hours && !hours.open
                        ? s.handoff.submitSendQuestion
                        : s.handoff.submitTalkToConsultant}
                  </button>
                </div>
              )}

              {(mode === "offline_done" || mode === "closed") && (
                <div className="flex justify-center pt-1">
                  <button
                    onClick={restart}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition text-muted-foreground"
                  >
                    {s.handoff.restartConversation}
                  </button>
                </div>
              )}
            </div>

            {/* Chips iniciais */}
            {mode === "bot" && messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {s.chat.quick.map((q) => (
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

            {/* Input */}
            {canType && (
              <div className="border-t border-border p-3 shrink-0">
                {recording ? (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="text-sm font-mono text-red-600 dark:text-red-400 flex-1">
                      {fmtSecs(recordingSecs)}
                    </span>
                    <span className="text-xs text-red-500 dark:text-red-400">{s.chat.recording}</span>
                    <button
                      onClick={stopRecording}
                      className="h-9 w-9 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shrink-0"
                      aria-label={s.chat.stopRecording}
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* pré-visualização do que será enviado */}
                    {(pending.length > 0 || uploading > 0 || uploadError) && (
                      <div className="mb-2 space-y-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {pending.map((a) => (
                            <div
                              key={a.path}
                              className="group relative flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg border border-border bg-muted/60 text-xs max-w-[180px]"
                            >
                              {a.type.startsWith("image/") ? (
                                <ImageIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                              ) : (
                                <FileIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                              <span className="truncate">{a.name}</span>
                              <button
                                onClick={() =>
                                  setPending((p) => p.filter((x) => x.path !== a.path))
                                }
                                className="p-0.5 rounded hover:bg-background shrink-0"
                                aria-label={s.handoff.removeAttachment(a.name)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {uploading > 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                              {s.handoff.uploading(uploading)}
                            </div>
                          )}
                        </div>
                        {uploadError && (
                          <div className="text-[11px] text-destructive">{uploadError}</div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 items-end">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onPaste={onPaste}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send(input);
                        }
                      }}
                      rows={1}
                      placeholder={
                        mode === "live"
                          ? s.handoff.replyingTo(agentName || s.handoff.defaultAgentName)
                          : mode === "waiting"
                            ? s.handoff.typeWhileWaiting
                            : s.chat.placeholder
                      }
                      disabled={loading}
                      style={{ resize: "none" }}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary max-h-28 transition overflow-auto"
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={loading || pending.length >= 5}
                      className="h-10 w-10 rounded-xl border border-border bg-background text-muted-foreground flex items-center justify-center hover:bg-muted hover:text-foreground transition disabled:opacity-50 shrink-0"
                      aria-label={s.handoff.attachFileAria}
                      title={s.handoff.attachFileTitle}
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    {mode === "bot" && (
                      <button
                        onClick={startRecording}
                        disabled={loading}
                        className="h-10 w-10 rounded-xl border border-border bg-background text-muted-foreground flex items-center justify-center hover:bg-muted hover:text-foreground transition disabled:opacity-50 shrink-0"
                        aria-label={s.chat.recordAudio}
                      >
                        <Mic className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => send(input)}
                      disabled={loading || uploading > 0 || (!input.trim() && !pending.length)}
                      className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-95 transition disabled:opacity-50 shrink-0"
                      aria-label={s.chat.send}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:brightness-95 transition-all duration-200 flex items-center justify-center
          ${open ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"}`}
        aria-label={s.chat.openAssistant}
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
