import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "./config";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Always start at DEFAULT_LOCALE so the client's first render matches the
  // server-rendered HTML exactly; the stored locale (if any) is applied right
  // after mount, in the effect below, to avoid a hydration mismatch.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem("locale");
    if (isLocale(stored) && stored !== locale) {
      setLocaleState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem("locale", locale);
    const htmlLang = LOCALES.find((l) => l.code === locale)?.htmlLang ?? "pt-BR";
    document.documentElement.lang = htmlLang;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale: setLocaleState }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
