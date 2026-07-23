"use client";

import { useState, useEffect, useRef } from "react";
import type { NewsItem } from "@/app/api/news/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CryptoItem { symbol: string; price: number; change24h: number }
interface StockItem  { symbol: string; price: number; change24h: number }
interface ForexItem  { pair: string;   rate: number;  change24h: number }

interface MarketsData {
  crypto: CryptoItem[];
  stocks: StockItem[];
  forex:  ForexItem[];
  fetchedAt: string;
}

type Category = "all" | "world" | "colombia" | "medellin" | "markets" | "crypto" | "sports";

const CATEGORY_TABS: { id: Category; label: string }[] = [
  { id: "all",      label: "All"      },
  { id: "world",    label: "World"    },
  { id: "colombia", label: "Colombia" },
  { id: "medellin", label: "Medellín" },
  { id: "markets",  label: "Markets"  },
  { id: "crypto",   label: "Crypto"   },
  { id: "sports",   label: "Sports"   },
];

const CATEGORY_COLOR: Record<string, string> = {
  world:    "text-info",
  colombia: "text-warn",
  medellin: "text-warn",
  markets:  "text-teal",
  crypto:   "text-teal",
  sports:   "text-info",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(n: number, isCOP = false): string {
  if (!n) return "--";
  if (isCOP) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function ChangeLabel({ change }: { change: number }) {
  if (!change && change !== 0) return <span className="text-muted/50 font-mono text-[10px]">—</span>;
  const cls = change > 0 ? "text-teal" : change < 0 ? "text-danger" : "text-muted/50";
  const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "—";
  return (
    <span className={`text-[10px] font-mono font-semibold ${cls}`}>
      {arrow}{Math.abs(change).toFixed(1)}%
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-start gap-3 p-3 animate-pulse">
      <div className="w-16 h-12 rounded bg-raised shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-raised rounded w-full" />
        <div className="h-3 bg-raised rounded w-4/5" />
        <div className="h-2 bg-raised rounded w-1/2" />
      </div>
    </div>
  );
}

function NewsItemCard({ item }: { item: NewsItem }) {
  const [imgErr, setImgErr] = useState(false);
  const d = item.publishedAt ? new Date(item.publishedAt) : null;
  const timeStr = d && !isNaN(d.getTime())
    ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 hover:bg-raised/30 transition-colors group"
    >
      {item.imageUrl && !imgErr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          width={64}
          height={48}
          onError={() => setImgErr(true)}
          className="hidden sm:block w-16 h-12 rounded object-cover shrink-0 opacity-80"
        />
      ) : (
        <div className="hidden sm:flex w-16 h-12 rounded bg-raised shrink-0 items-center justify-center">
          <span className="text-muted/30 text-xs font-mono">{item.source.slice(0, 2).toUpperCase()}</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-bright leading-snug mb-0.5 line-clamp-2">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] font-mono text-muted/60">{item.source}</span>
          <span className="text-muted/30 text-[9px]">·</span>
          <span className={`text-[9px] font-mono ${CATEGORY_COLOR[item.category] ?? "text-muted"}`}>
            {item.category}
          </span>
          {timeStr && (
            <>
              <span className="text-muted/30 text-[9px]">·</span>
              <span className="text-[9px] font-mono text-muted/50">{timeStr}</span>
            </>
          )}
        </div>
        {item.description && (
          <p className="text-[10px] text-muted/70 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      <span className="text-muted/30 group-hover:text-teal text-xs shrink-0 transition-colors">→</span>
    </a>
  );
}

// ─── Markets strip ────────────────────────────────────────────────────────────

const FOREX_FALLBACK = [
  { label: "USD/COP", value: "--", change: 0 },
  { label: "EUR/COP", value: "--", change: 0 },
];

const STRIP_PLACEHOLDER = ["BTC", "ETH", "BNB", "SOL", "TAO", "S&P500", "NASDAQ", "COLCAP", "USD/COP", "EUR/COP"];

function MarketsStrip({ markets }: { markets: MarketsData | null }) {
  if (!markets) {
    return (
      <div className="border-t border-line bg-raised/30 px-4 py-2 overflow-hidden">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
          {STRIP_PLACEHOLDER.map((s) => (
            <div key={s} className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-bright">{s}</span>
              <span className="text-[10px] font-mono text-muted/40">--</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const forexItems = markets.forex.length > 0
    ? markets.forex.map((f) => ({ label: f.pair, value: formatPrice(f.rate, true), change: f.change24h }))
    : FOREX_FALLBACK;

  const items = [
    ...markets.crypto.map((c) => ({ label: c.symbol, value: `$${formatPrice(c.price)}`, change: c.change24h })),
    ...markets.stocks.map((s) => ({ label: s.symbol, value: formatPrice(s.price), change: s.change24h })),
    ...forexItems,
  ];

  return (
    <div className="border-t border-line bg-raised/30 px-4 py-2 overflow-hidden">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
        {items.map((t) => (
          <div key={t.label} className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold text-bright">{t.label}</span>
            <span className="text-[10px] font-mono text-muted/70">{t.value}</span>
            <ChangeLabel change={t.change} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NewsWidget ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;
const MARKETS_REFRESH_MS = 5 * 60 * 1000;

export function NewsWidget() {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [markets, setMarkets] = useState<MarketsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error, setError]     = useState(false);
  const [category, setCategory] = useState<Category>("all");
  const [page, setPage]       = useState(1);
  const marketsTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMarkets = async () => {
    try {
      const res = await fetch("/api/markets");
      if (res.ok) setMarkets(await res.json());
    } catch {
      // markets failure is silent
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/news").then((r) => r.json()),
      fetchMarkets(),
    ])
      .then(([newsData]) => {
        setNews(newsData.items ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });

    marketsTimer.current = setInterval(fetchMarkets, MARKETS_REFRESH_MS);
    return () => {
      if (marketsTimer.current) clearInterval(marketsTimer.current);
    };
  }, []);

  // Show slow-load hint after 3s if still loading
  useEffect(() => {
    if (!loading) { setSlowLoad(false); return; }
    const t = setTimeout(() => setSlowLoad(true), 3000);
    return () => clearTimeout(t);
  }, [loading]);

  // Reset page when category changes
  useEffect(() => { setPage(1); }, [category]);

  const filtered = category === "all" ? news : news.filter((i) => i.category === category);
  const visible  = filtered.slice(0, page * PAGE_SIZE);
  const hasMore  = visible.length < filtered.length;

  return (
    <div className="bg-card border border-line rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-raised/40">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">News Feed</p>
        {markets?.fetchedAt && (
          <span className="text-[9px] font-mono text-muted/40">
            {new Date(markets.fetchedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-line/40 overflow-x-auto scrollbar-none">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategory(tab.id)}
            className={[
              "px-2.5 py-1 text-[10px] font-mono rounded transition-colors shrink-0",
              category === tab.id
                ? "bg-teal/15 text-teal"
                : "text-muted/60 hover:text-bright",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* News items */}
      <div className="divide-y divide-line/30">
        {loading && (
          <>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            {slowLoad && (
              <p className="text-[10px] font-mono text-muted/40 text-center pb-3">
                Loading news... (this may take a moment)
              </p>
            )}
          </>
        )}

        {!loading && error && (
          <p className="text-xs text-muted/50 font-mono text-center py-6">
            News temporarily unavailable.
          </p>
        )}

        {!loading && !error && visible.length === 0 && (
          <p className="text-xs text-muted/50 font-mono text-center py-6">
            No articles in this category.
          </p>
        )}

        {visible.map((item, i) => (
          <NewsItemCard key={`${item.source}-${i}`} item={item} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="px-4 py-2 border-t border-line/30 text-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="text-[10px] font-mono text-muted/60 hover:text-teal transition-colors"
          >
            Load more →
          </button>
        </div>
      )}

      {/* Markets strip */}
      <MarketsStrip markets={markets} />
    </div>
  );
}
