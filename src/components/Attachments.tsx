import { File as FileIcon, Download } from "lucide-react";

export type Attachment = {
  path: string;
  name: string;
  type: string;
  size: number;
  /** link assinado, gerado na leitura e temporário */
  url?: string;
};

export const fmtSize = (b: number) =>
  b < 1024
    ? `${b} B`
    : b < 1048576
      ? `${Math.round(b / 1024)} KB`
      : `${(b / 1048576).toFixed(1)} MB`;

/** Anexos de uma mensagem: imagem vira miniatura clicável, resto vira arquivo. */
export function AttachmentList({
  items,
  align = "left",
}: {
  items: Attachment[];
  align?: "left" | "right";
}) {
  if (!items.length) return null;
  return (
    <div className={`mt-1.5 flex flex-wrap gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
      {items.map((a) =>
        a.type.startsWith("image/") && a.url ? (
          <a
            key={a.path}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-border hover:opacity-90 transition"
            title={a.name}
          >
            <img src={a.url} alt={a.name} className="max-h-44 max-w-[220px] object-cover block" />
          </a>
        ) : (
          <a
            key={a.path}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-border bg-background hover:bg-muted transition max-w-[240px]"
            title={a.name}
          >
            <FileIcon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs truncate flex-1">{a.name}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">{fmtSize(a.size)}</span>
            <Download className="h-3 w-3 text-muted-foreground shrink-0" />
          </a>
        ),
      )}
    </div>
  );
}
