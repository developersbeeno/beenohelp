import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlagIcon } from "@/components/FlagIcon";
import { LOCALES } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/locale-context";
import { useStrings } from "@/lib/i18n/strings";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const s = useStrings(locale);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={s.nav.language}
          className={
            compact
              ? "h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition"
              : "h-9 inline-flex items-center gap-1.5 px-2.5 rounded-lg border border-border bg-background hover:bg-muted transition text-sm font-medium text-foreground/80"
          }
        >
          <FlagIcon locale={current.code} />
          {!compact && <span>{current.code.toUpperCase()}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={`flex items-center gap-2 ${l.code === locale ? "bg-accent text-accent-foreground" : ""}`}
          >
            <FlagIcon locale={l.code} />
            <span>{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
