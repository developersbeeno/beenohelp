import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ArrowLeft, Rocket, LayoutList, Users, TrendingUp, Zap, Link2 } from "lucide-react";
import { articles, categories, homeCards, type Article } from "@/lib/articles";
import { Markdown } from "@/components/Markdown";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beeno Help Center — Como podemos ajudar?" },
      {
        name: "description",
        content: "Explore a documentação do Beeno CRM ou converse com nosso assistente de IA.",
      },
    ],
  }),
  component: HomePage,
});

function CardIcon({ name }: { name: string }) {
  const cls = "h-5 w-5";
  switch (name) {
    case "rocket":
      return <Rocket className={cls} />;
    case "pipeline":
      return <LayoutList className={cls} />;
    case "contacts":
      return <Users className={cls} />;
    case "deals":
      return <TrendingUp className={cls} />;
    case "automation":
      return <Zap className={cls} />;
    case "link":
      return <Link2 className={cls} />;
    default:
      return <Rocket className={cls} />;
  }
}

function HomePage() {
  const [query, setQuery] = useState("");
  const [openArticle, setOpenArticle] = useState<Article | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }, [query]);

  const openBySlug = (slug: string) => {
    if (slug === "__api") return;
    const a = articles.find((x) => x.slug === slug);
    if (a) {
      setOpenArticle(a);
      setQuery("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="hero-pattern border-b border-border bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Como podemos ajudar?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Explore a documentação do Beeno CRM ou converse com nosso assistente de IA
          </p>
          <div className="mt-8 relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artigos, endpoints, integrações..."
              className="w-full h-14 pl-12 pr-4 rounded-xl border border-border bg-card text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>
        </div>
      </section>

      {/* Search results */}
      {filtered !== null && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para "{query}"
          </p>
          <div className="grid gap-3">
            {filtered.map((a) => (
              <button
                key={a.slug}
                onClick={() => openBySlug(a.slug)}
                className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>{a.categoryLabel}</span>
                </div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Main two-column */}
      {filtered === null && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
            <nav className="space-y-6">
              {categories.map((cat) => (
                <div key={cat.key}>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {cat.label}
                  </h4>
                  <ul className="space-y-1">
                    {cat.items.map((it) => (
                      <li key={it.slug}>
                        <button
                          onClick={() => openBySlug(it.slug)}
                          className={`text-left w-full text-sm py-1 px-2 rounded-md transition ${
                            openArticle?.slug === it.slug
                              ? "bg-accent text-accent-foreground font-medium"
                              : "text-foreground/70 hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {it.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Referência
                </h4>
                <a
                  href="https://api.beeno.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline block px-2"
                >
                  API Docs →
                </a>
              </div>
            </nav>
          </aside>

          {/* Content */}
          <div>
            {openArticle ? (
              <article className="max-w-3xl">
                <button
                  onClick={() => setOpenArticle(null)}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </button>
                <nav className="text-xs text-muted-foreground mb-3">
                  Início <span className="mx-1">›</span> {openArticle.categoryLabel}{" "}
                  <span className="mx-1">›</span>{" "}
                  <span className="text-foreground">{openArticle.title}</span>
                </nav>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-2.5 py-0.5 text-xs font-medium">
                    {openArticle.categoryLabel}
                  </span>
                </div>
                <h1 className="text-3xl font-bold mb-6">{openArticle.title}</h1>
                <Markdown>{openArticle.content}</Markdown>
              </article>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-6">Explore por tópico</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {homeCards.map((c) => {
                    const inner = (
                      <div className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition h-full">
                        <div className="mb-3 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <CardIcon name={c.icon} />
                        </div>
                        <h3 className="font-semibold mb-1">{c.title}</h3>
                        <p className="text-sm text-muted-foreground">{c.description}</p>
                      </div>
                    );
                    return (
                      <button
                        key={c.title}
                        onClick={() => openBySlug(c.slug)}
                        className="text-left"
                      >
                        {inner}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
