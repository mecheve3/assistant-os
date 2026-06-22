import { NextResponse } from "next/server";

export const runtime   = "edge";
export const revalidate = 300;

interface CryptoItem { symbol: string; price: number; change24h: number }
interface StockItem  { symbol: string; price: number; change24h: number }
interface ForexItem  { pair: string; rate: number; change24h: number }

interface MarketsData {
  crypto: CryptoItem[];
  stocks: StockItem[];
  forex: ForexItem[];
  fetchedAt: string;
}

// ─── In-memory cache (5 min) ─────────────────────────────────────────────────

let cache: { data: MarketsData; ts: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

// ─── Crypto ───────────────────────────────────────────────────────────────────

async function fetchCrypto(): Promise<CryptoItem[]> {
  const url =
    "https://api.coingecko.com/api/v3/simple/price" +
    "?ids=bitcoin,ethereum,binancecoin,solana,bittensor" +
    "&vs_currencies=usd&include_24hr_change=true";

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`CoinGecko: ${res.status}`);
  const d = await res.json();

  const MAP: Record<string, string> = {
    bitcoin:     "BTC",
    ethereum:    "ETH",
    binancecoin: "BNB",
    solana:      "SOL",
    bittensor:   "TAO",
  };

  return Object.entries(MAP).map(([id, symbol]) => ({
    symbol,
    price:     Math.round(d[id]?.usd ?? 0),
    change24h: parseFloat((d[id]?.usd_24h_change ?? 0).toFixed(2)),
  }));
}

// ─── Stocks via Yahoo Finance ─────────────────────────────────────────────────

async function fetchYahoo(
  ticker: string,
  label: string
): Promise<{ price: number; change24h: number }> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=1d&range=2d`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PersonalOS/1.0)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Yahoo Finance ${label}: ${res.status}`);

  const d = await res.json();
  const result = d?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo Finance ${label}: no result`);

  const price     = Number(result.meta?.regularMarketPrice ?? 0);
  const prevClose = Number(result.meta?.chartPreviousClose ?? result.meta?.previousClose ?? 0);
  const change24h = prevClose > 0
    ? parseFloat(((price - prevClose) / prevClose * 100).toFixed(2))
    : 0;

  return { price: Math.round(price), change24h };
}

async function fetchStocks(): Promise<StockItem[]> {
  const [sp500, nasdaq, colcap] = await Promise.allSettled([
    fetchYahoo("^GSPC",    "S&P500"),
    fetchYahoo("^IXIC",    "NASDAQ"),
    fetchYahoo("COLCAP.IC","COLCAP"),
  ]);

  const get = (
    r: PromiseSettledResult<{ price: number; change24h: number }>,
    label: string
  ) => {
    if (r.status === "rejected") console.error(`[markets/stocks] ${label}:`, r.reason);
    return r.status === "fulfilled" ? r.value : { price: 0, change24h: 0 };
  };

  return [
    { symbol: "S&P500", ...get(sp500,  "S&P500") },
    { symbol: "NASDAQ",  ...get(nasdaq, "NASDAQ") },
    { symbol: "COLCAP",  ...get(colcap, "COLCAP") },
  ];
}

// ─── Forex via Frankfurter ────────────────────────────────────────────────────

async function fetchForex(): Promise<ForexItem[]> {
  const res = await fetch(
    "https://api.frankfurter.app/latest?from=USD&to=COP,EUR",
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`Frankfurter: ${res.status}`);

  const d = await res.json();
  const cop = Number(d.rates?.COP ?? 0);
  const eur = Number(d.rates?.EUR ?? 0);

  if (!cop) throw new Error("Frankfurter: no COP rate");

  return [
    { pair: "USD/COP", rate: Math.round(cop), change24h: 0 },
    { pair: "EUR/COP", rate: eur > 0 ? Math.round(cop / eur) : 0, change24h: 0 },
  ];
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json(cache.data);
  }

  const [crypto, stocks, forex] = await Promise.allSettled([
    fetchCrypto(),
    fetchStocks(),
    fetchForex(),
  ]);

  if (crypto.status === "rejected") console.error("[markets/crypto]", crypto.reason);
  if (forex.status  === "rejected") console.error("[markets/forex]",  forex.reason);

  const data: MarketsData = {
    crypto:    crypto.status === "fulfilled" ? crypto.value : (cache?.data.crypto ?? []),
    stocks:    stocks.status === "fulfilled" ? stocks.value : (cache?.data.stocks ?? []),
    forex:     forex.status  === "fulfilled" ? forex.value  : (cache?.data.forex  ?? []),
    fetchedAt: new Date().toISOString(),
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}
