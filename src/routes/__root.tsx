import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { Moon, Sun, Menu, X as XIcon } from "lucide-react";

import appCss from "../styles.css?url";
import { ChatDrawer } from "@/components/ChatDrawer";

const WA_LINK =
  "https://wa.me/5511941301642?text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20o%20suporte%20do%20Beeno.";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Página não encontrada.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Tentar novamente
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
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function BeenoLogo() {
  return (
    <Link to="/" className="flex items-center shrink-0">
      <img src="/logo-beeno.png" alt="Beeno by Skeps" className="h-8 w-auto object-contain" />
    </Link>
  );
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);
  return [dark, setDark] as const;
}

function Navbar({ onOpenChat }: { onOpenChat: () => void }) {
  const [dark, setDark] = useDarkMode();
  const [mobileOpen, setMobileOpen] = useState(false);
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
            Início
          </Link>
          <button
            onClick={onOpenChat}
            className={linkCls + " cursor-pointer bg-transparent border-none p-0"}
          >
            Assistente IA
          </button>
          <a
            href="https://api.beeno.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className={linkCls}
          >
            API Docs
          </a>
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setDark((d) => !d)}
            className="p-2 rounded-lg border border-border bg-background hover:bg-muted transition text-muted-foreground hover:text-foreground"
            aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a
            href="https://app.beeno.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted transition"
          >
            Acessar plataforma
          </a>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:brightness-95 transition"
          >
            Falar com suporte
          </a>
        </div>

        {/* Mobile: dark toggle + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setDark((d) => !d)}
            className="p-2 rounded-lg border border-border bg-background text-muted-foreground"
            aria-label="Alternar tema"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 rounded-lg border border-border bg-background text-muted-foreground"
            aria-label="Menu"
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
            Início
          </Link>
          <button
            onClick={() => {
              onOpenChat();
              setMobileOpen(false);
            }}
            className="py-2 text-left text-sm font-medium text-foreground/70 hover:text-foreground bg-transparent border-none cursor-pointer"
          >
            Assistente IA
          </button>
          <a
            href="https://api.beeno.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 text-sm font-medium text-foreground/70 hover:text-foreground"
            onClick={() => setMobileOpen(false)}
          >
            API Docs
          </a>
          <div className="border-t border-border mt-1 pt-2 flex flex-col gap-2">
            <a
              href="https://app.beeno.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              Acessar plataforma
            </a>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 text-sm font-semibold text-primary"
            >
              Falar com suporte
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar onOpenChat={() => setChatOpen(true)} />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © 2025 Beeno by Skeps. Todos os direitos reservados.
        </footer>
      </div>
      <ChatDrawer externalOpen={chatOpen} onExternalOpenHandled={() => setChatOpen(false)} />
    </QueryClientProvider>
  );
}
