import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { Moon, Sun, Menu, X as XIcon } from "lucide-react";

import appCss from "../styles.css?url";
import { ChatDrawer } from "@/components/ChatDrawer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LocaleProvider, useLocale } from "@/lib/i18n/locale-context";
import { useStrings } from "@/lib/i18n/strings";

function NotFoundComponent() {
  const { locale } = useLocale();
  const s = useStrings(locale);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">{s.notFound.message}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {s.notFound.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { locale } = useLocale();
  const s = useStrings(locale);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{s.errorPage.title}</h1>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          {s.errorPage.retry}
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Beeno Help Center — Documentação e Suporte" },
      {
        name: "description",
        content:
          "Central de ajuda do Beeno CRM: documentação, referência da API e assistente de IA.",
      },
      { property: "og:title", content: "Beeno Help Center — Documentação e Suporte" },
      {
        property: "og:description",
        content:
          "Central de ajuda do Beeno CRM: documentação, referência da API e assistente de IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
        <Scripts />
      </body>
    </html>
  );
}

function BeenoLogo() {
  return (
    <Link to="/" className="flex items-center shrink-0">
      <img
        src="/logo-beeno.png"
        alt="Beeno by Skeps"
        className="h-8 w-auto object-contain dark:hidden"
      />
      <img
        src="/logo-beeno-white.png"
        alt="Beeno by Skeps"
        className="h-8 w-auto object-contain hidden dark:block"
      />
    </Link>
  );
}

function useDarkMode() {
  // Always start light so the client's first render matches the server-rendered
  // HTML exactly; the stored/system preference is applied right after mount, in
  // the effect below, to avoid a hydration mismatch.
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDark(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Desliga transições durante a troca: evita quadros intermediários com
    // cores misturadas em elementos que usam transition de cor.
    root.classList.add("theme-switching");

    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    // Força um repaint completo síncrono. Sem isso, camadas compostas
    // (ex.: o drawer do chat, promovido por transform) mantêm a PINTURA do
    // tema antigo mesmo com o CSS já correto — o Chrome não invalida o layer
    // quando só as variáveis de tema mudam. O display:none + reflow descarta
    // e recria as camadas no mesmo frame, então não há flash visível.
    const body = document.body;
    if (body) {
      const prev = body.style.display;
      body.style.display = "none";
      void body.offsetHeight; // reflow síncrono
      body.style.display = prev;
    }

    // devolve as transições logo depois da troca. setTimeout (não rAF):
    // rAF não dispara com a aba em segundo plano e a classe ficaria presa,
    // deixando o app sem transições até o próximo toggle.
    const t = setTimeout(() => root.classList.remove("theme-switching"), 80);
    return () => clearTimeout(t);
  }, [dark]);
  return [dark, setDark] as const;
}

function Navbar({
  onOpenChat,
  hideSupportCta = false,
}: {
  onOpenChat: () => void;
  hideSupportCta?: boolean;
}) {
  const [dark, setDark] = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { locale } = useLocale();
  const s = useStrings(locale);
  const linkCls = "text-sm font-medium text-foreground/70 hover:text-foreground transition-colors";
  const activeCls = "text-foreground";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <BeenoLogo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className={linkCls}
            activeProps={{ className: activeCls }}
            activeOptions={{ exact: true }}
          >
            {s.nav.home}
          </Link>
          <button
            onClick={onOpenChat}
            className={linkCls + " cursor-pointer bg-transparent border-none p-0"}
          >
            {s.nav.assistant}
          </button>
          <a
            href="https://api.beeno.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className={linkCls}
          >
            {s.nav.apiDocs}
          </a>
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={() => setDark((d) => !d)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition text-muted-foreground hover:text-foreground"
            aria-label={dark ? s.nav.enableLight : s.nav.enableDark}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a
            href="https://app.beeno.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 inline-flex items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground/80 hover:bg-muted transition"
          >
            {s.nav.platform}
          </a>
          {!hideSupportCta && (
            <button
              onClick={onOpenChat}
              className="h-9 inline-flex items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:brightness-95 transition cursor-pointer border-none"
            >
              {s.nav.support}
            </button>
          )}
        </div>

        {/* Mobile: language + dark toggle + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher compact />
          <button
            onClick={() => setDark((d) => !d)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground"
            aria-label={s.nav.toggleTheme}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground"
            aria-label={s.nav.menu}
          >
            {mobileOpen ? <XIcon className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1">
          <Link
            to="/"
            className="py-2 text-sm font-medium text-foreground/70 hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            {s.nav.home}
          </Link>
          <button
            onClick={() => {
              onOpenChat();
              setMobileOpen(false);
            }}
            className="py-2 text-left text-sm font-medium text-foreground/70 hover:text-foreground bg-transparent border-none cursor-pointer"
          >
            {s.nav.assistant}
          </button>
          <a
            href="https://api.beeno.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 text-sm font-medium text-foreground/70 hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            {s.nav.apiDocs}
          </a>
          <div className="border-t border-border mt-1 pt-2 flex flex-col gap-2">
            <a
              href="https://app.beeno.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              {s.nav.platform}
            </a>
            <button
              onClick={() => {
                onOpenChat();
                setMobileOpen(false);
              }}
              className="py-2 text-left text-sm font-semibold text-primary bg-transparent border-none cursor-pointer"
            >
              {s.nav.support}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const { locale } = useLocale();
  const s = useStrings(locale);
  return (
    <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
      {s.footer.rights}
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [chatOpen, setChatOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // O painel do atendente não é uma tela de cliente: o widget de chat só
  // atrapalharia (e sobrepõe os gráficos do dashboard).
  const isAgentPanel = pathname.startsWith("/atendimento");

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar onOpenChat={() => setChatOpen(true)} hideSupportCta={isAgentPanel} />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      {!isAgentPanel && (
        <ChatDrawer externalOpen={chatOpen} onExternalOpenHandled={() => setChatOpen(false)} />
      )}
    </QueryClientProvider>
  );
}
