import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  source: string;
  category: "world" | "colombia" | "medellin" | "markets" | "crypto" | "sports";
  lang: "en" | "es";
}

const FEEDS = [
  // World
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml",              source: "BBC World",          category: "world"    as const, lang: "en" as const },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",   source: "NY Times",           category: "world"    as const, lang: "en" as const },
  // Colombia
  { url: "https://www.eltiempo.com/rss/colombia.xml",                 source: "El Tiempo",          category: "colombia" as const, lang: "es" as const },
  { url: "https://www.elcolombiano.com/googlenews.xml",               source: "El Colombiano",      category: "colombia" as const, lang: "es" as const },
  // Medellín
  { url: "https://www.minuto30.com/feed/",                            source: "Minuto30",           category: "medellin" as const, lang: "es" as const },
  { url: "https://www.rcnradio.com/feed",                             source: "RCN Radio",          category: "medellin" as const, lang: "es" as const },
  { url: "https://telemedellín.tv/feed/",                            source: "Telemedellín",       category: "medellin" as const, lang: "es" as const },
  // Markets
  { url: "https://feeds.bloomberg.com/markets/news.rss",              source: "Bloomberg",          category: "markets"  as const, lang: "en" as const },
  // Crypto
  { url: "https://cointelegraph.com/rss",                             source: "CoinTelegraph",      category: "crypto"   as const, lang: "en" as const },
  // Sports
  { url: "https://www.espn.com/espn/rss/nba/news",                   source: "ESPN NBA",           category: "sports"   as const, lang: "en" as const },
  { url: "https://www.espn.com/espn/rss/soccer/news",                source: "ESPN Soccer",        category: "sports"   as const, lang: "en" as const },
  { url: "https://www.as.com/rss/tags/atletico_nacional.xml",        source: "AS Colombia",        category: "sports"   as const, lang: "es" as const },
  { url: "https://www.eltiempo.com/rss/deportes.xml",                source: "El Tiempo Deportes", category: "sports"   as const, lang: "es" as const },
];

// ─── In-memory cache (15 min) ─────────────────────────────────────────────────

let cache: { items: NewsItem[]; ts: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

// ─── Parse ───────────────────────────────────────────────────────────────────

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
});

function extractImage(item: Record<string, unknown>): string | null {
  // <media:content url="...">
  const media = item["media:content"] as Record<string, unknown> | undefined;
  if (media?.["@_url"]) return media["@_url"] as string;

  // <enclosure url="..." type="image/...">
  const enc = item["enclosure"] as Record<string, unknown> | undefined;
  if (enc?.["@_url"] && String(enc["@_type"] ?? "").startsWith("image")) {
    return enc["@_url"] as string;
  }

  // <media:thumbnail url="...">
  const thumb = item["media:thumbnail"] as Record<string, unknown> | undefined;
  if (thumb?.["@_url"]) return thumb["@_url"] as string;

  return null;
}

function truncate(str: string, max: number): string {
  if (!str) return "";
  const plain = str.replace(/<[^>]+>/g, "").trim();
  return plain.length > max ? plain.slice(0, max) + "…" : plain;
}

async function fetchFeed(
  feed: (typeof FEEDS)[number]
): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PersonalOS/1.0)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const parsed = parser.parse(xml);

  const items: Record<string, unknown>[] =
    parsed?.rss?.channel?.item ??
    parsed?.feed?.entry ??
    [];

  return (Array.isArray(items) ? items : [items])
    .slice(0, 4)
    .map((item) => ({
      title:       truncate(String(item.title ?? ""), 120),
      description: truncate(String(item.description ?? item.summary ?? ""), 120),
      url:         String((item.link as Record<string, unknown>)?.["@_href"] ?? item.link ?? item.guid ?? ""),
      imageUrl:    extractImage(item),
      publishedAt: String(item.pubDate ?? item.published ?? item.updated ?? ""),
      source:      feed.source,
      category:    feed.category,
      lang:        feed.lang,
    }))
    .filter((i) => i.title && i.url);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json({ items: cache.items, cached: true });
  }

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  const items: NewsItem[] = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tb - ta;
    });

  if (items.length > 0) {
    cache = { items, ts: Date.now() };
  }

  return NextResponse.json({
    items: items.length > 0 ? items : (cache?.items ?? []),
    cached: false,
    fetchedAt: new Date().toISOString(),
  });
}
