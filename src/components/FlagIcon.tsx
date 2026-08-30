import type { Locale } from "@/lib/i18n/config";

// Windows doesn't render regional-indicator flag emoji as flags (it falls back to
// bare letter codes), so we ship tiny inline SVG flags instead — consistent on every OS.
export function FlagIcon({ locale, className }: { locale: Locale; className?: string }) {
  const common = { className: className ?? "h-3.5 w-5 rounded-[2px] shrink-0", viewBox: "0 0 20 14" };

  if (locale === "pt") {
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <rect width="20" height="14" fill="#009739" />
        <polygon points="10,1.5 18.5,7 10,12.5 1.5,7" fill="#FEDD00" />
        <circle cx="10" cy="7" r="3.6" fill="#012169" />
      </svg>
    );
  }

  if (locale === "en") {
    return (
      <svg {...common} xmlns="http://www.w3.org/2000/svg">
        <rect width="20" height="14" fill="#B22234" />
        {[0, 2, 4, 6, 8, 10, 12].map((y) => (
          <rect key={y} y={y} width="20" height="1" fill="white" />
        ))}
        <rect width="9" height="7" fill="#3C3B6E" />
      </svg>
    );
  }

  return (
    <svg {...common} xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="14" fill="#AA151B" />
      <rect y="3.5" width="20" height="7" fill="#F1BF00" />
    </svg>
  );
}
