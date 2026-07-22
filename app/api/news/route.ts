import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

export const maxDuration = 30;
export const revalidate  = 900;

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

type Feed = {
  url: string;
  fallbackUrls?: string[];
  source: string;
  category: NewsItem["category"];
  lang: "en" | "es";
};

// Primary feeds — always fetched, must be reliable
const PRIMARY_FEEDS: Feed[] = [
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World",     category: "world",    lang: "en" },
  {
    url: "https://www.elcolombiano.com/googlenews.xml",
    fallbackUrls: [
      "https://www.elcolombiano.com/feed",
      "https://www.elcolombiano.com/rss.xml",
    ],
    source: "El Colombiano",
    category: "colombia",
    lang: "es",
  },
  { url: "https://cointelegraph.com/rss",               source: "CoinTelegraph", category: "crypto",   lang: "en" },
  { url: "https://www.espn.com/espn/rss/nba/news",      source: "ESPN NBA",      category: "sports",   lang: "en" },
];

// Secondary feeds — raced against a 3s window after primary completes
const SECONDARY_FEEDS: Feed[] = [
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "NY Times",           category: "world",    lang: "en" },
  { url: "https://www.eltiempo.com/rss/colombia.xml",              source: "El Tiempo",          category: "colombia", lang: "es" },
  { url: "https://feeds.bloomberg.com/markets/news.rss",           source: "Bloomberg",          category: "markets",  lang: "en" },
  { url: "https://www.espn.com/espn/rss/soccer/news",             source: "ESPN Soccer",        category: "sports",   lang: "en" },
  { url: "https://www.as.com/rss/tags/atletico_nacional.xml",     source: "AS Colombia",        category: "sports",   lang: "es" },
  { url: "https://www.minuto30.com/feed/",                        source: "Minuto30",           category: "medellin", lang: "es" },
  { url: "https://www.rcnradio.com/feed",                         source: "RCN Radio",          category: "medellin", lang: "es" },
  { url: "https://telemedellín.tv/feed/",                        source: "Telemedellín",       category: "medellin", lang: "es" },
  { url: "https://www.eltiempo.com/rss/deportes.xml",             source: "El Tiempo Deportes", category: "sports",   lang: "es" },
];

// ─── In-memory cache (15 min) ─────────────────────────────────────────────────

let cache: { items: NewsItem[]; ts: number } | null = null;
const CACHE_MS    = 15 * 60 * 1000;
const FEED_TIMEOUT = 5000;

// ─── Parse ───────────────────────────────────────────────────────────────────

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
});

function extractImage(item: Record<string, unknown>): string | null {
  const media = item["media:content"] as Record<string, unknown> | undefined;
  if (media?.["@_url"]) return media["@_url"] as string;

  const enc = item["enclosure"] as Record<string, unknown> | undefined;
  if (enc?.["@_url"] && String(enc["@_type"] ?? "").startsWith("image")) {
    return enc["@_url"] as string;
  }

  const thumb = item["media:thumbnail"] as Record<string, unknown> | undefined;
  if (thumb?.["@_url"]) return thumb["@_url"] as string;

  return null;
}

function truncate(str: string, max: number): string {
  if (!str) return "";
  const plain = str.replace(/<[^>]+>/g, "").trim();
  return plain.length > max ? plain.slice(0, max) + "…" : plain;
}

function parseRSS(xml: string, feed: Feed): NewsItem[] {
  const parsed = parser.parse(xml);

  // Standard RSS / Atom
  const rssItems: Record<string, unknown>[] =
    parsed?.rss?.channel?.item ??
    parsed?.feed?.entry ??
    [];

  if (rssItems.length > 0 || parsed?.rss || parsed?.feed) {
    return (Array.isArray(rssItems) ? rssItems : [rssItems])
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

  // Google News sitemap format (googlenews.xml)
  const sitemapUrls: Record<string, unknown>[] = parsed?.urlset?.url ?? [];
  return (Array.isArray(sitemapUrls) ? sitemapUrls : [sitemapUrls])
    .slice(0, 4)
    .map((u) => {
      const news = u["news:news"] as Record<string, unknown> | undefined;
      const img  = u["image:image"] as Record<string, unknown> | undefined;
      return {
        title:       truncate(String(news?.["news:title"] ?? ""), 120),
        description: "",
        url:         String(u.loc ?? ""),
        imageUrl:    img ? String(img["image:loc"] ?? "") || null : null,
        publishedAt: String(news?.["news:publication_date"] ?? ""),
        source:      feed.source,
        category:    feed.category,
        lang:        feed.lang,
      };
    })
    .filter((i) => i.title && i.url);
}

async function fetchUrl(url: string, feed: Feed): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PersonalOS/1.0)" },
    next: { revalidate: 0 },
  });
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return parseRSS(xml, feed);
}

async function fetchFeedSafe(feed: Feed): Promise<NewsItem[]> {
  const urls = [feed.url, ...(feed.fallbackUrls ?? [])];
  for (const url of urls) {
    try {
      const items = await fetchUrl(url, feed);
      if (items.length > 0) return items;
    } catch {
      console.error(`[news] Feed failed: ${feed.source} @ ${url}`);
    }
  }
  return [];
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json({ items: cache.items, cached: true });
  }

  // Primary feeds always fetched fully
  const primaryResults = await Promise.all(PRIMARY_FEEDS.map(fetchFeedSafe));

  // Secondary feeds raced against a 3s window — skipped entirely if too slow
  const secondaryResults: NewsItem[][] = await Promise.race([
    Promise.all(SECONDARY_FEEDS.map(fetchFeedSafe)),
    new Promise<NewsItem[][]>((resolve) => setTimeout(() => resolve([]), 3000)),
  ]);

  const sorted: NewsItem[] = [
    ...primaryResults.flat(),
    ...secondaryResults.flat(),
  ].sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });

  // Cap sports to 3 items so they don't dominate the "All" feed
  let sportsCount = 0;
  const items = sorted.filter((item) => {
    if (item.category === "sports") {
      if (sportsCount >= 3) return false;
      sportsCount++;
    }
    return true;
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
