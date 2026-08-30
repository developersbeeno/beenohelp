export type Locale = "pt" | "en" | "es";

export const DEFAULT_LOCALE: Locale = "pt";

export const LOCALES: { code: Locale; label: string; flag: string; htmlLang: string }[] = [
  { code: "pt", label: "Português", flag: "🇧🇷", htmlLang: "pt-BR" },
  { code: "en", label: "English", flag: "🇺🇸", htmlLang: "en" },
  { code: "es", label: "Español", flag: "🇪🇸", htmlLang: "es" },
];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "pt" || value === "en" || value === "es";
}
