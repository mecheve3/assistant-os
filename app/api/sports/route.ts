import { NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string;
  competition: string;
}

interface UpcomingMatch {
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
}

interface Standing {
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  league: string;
}

interface GameResult {
  opponent: string;
  lakersScore: number;
  opponentScore: number;
  win: boolean;
  date: string;
}

interface UpcomingGame {
  opponent: string;
  date: string;
  time: string;
}

interface LakersStanding {
  conference: string;
  position: number;
  wins: number;
  losses: number;
}

export interface SportsData {
  nacional: {
    lastMatch: MatchResult | null;
    nextMatch: UpcomingMatch | null;
    standing: Standing | null;
    error: string | null;
  };
  lakers: {
    lastGame: GameResult | null;
    nextGame: UpcomingGame | null;
    standing: LakersStanding | null;
    error: string | null;
  };
  fetchedAt: string;
}

// ─── Cache (30 min) ──────────────────────────────────────────────────────────

let cache: { data: SportsData; ts: number } | null = null;
const CACHE_MS = 30 * 60 * 1000;

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isoDate(d: Date) { return d.toISOString().split("T")[0]; }

function today() { return isoDate(new Date()); }

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDate(d);
}

function formatMatchTime(dateStr: string, timeZone = "America/Bogota"): { date: string; time: string } {
  if (!dateStr) return { date: "", time: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: dateStr, time: "" };
  return {
    date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone }),
  };
}

// ─── Atletico Nacional (API-Football) ────────────────────────────────────────

const NACIONAL_TEAM_ID    = 2271;
const LIGA_BETPLAY_ID     = 239;
const COPA_LIBERTADORES_ID = 13;
const FOOTBALL_API_BASE   = "https://v3.football.api-sports.io";

async function parseFixture(res: PromiseSettledResult<Response>): Promise<MatchResult | null> {
  if (res.status !== "fulfilled" || !res.value.ok) return null;
  const d = await res.value.json();
  const f = d.response?.[0];
  if (!f) return null;
  return {
    homeTeam:    f.teams.home.name,
    awayTeam:    f.teams.away.name,
    homeScore:   f.goals.home ?? 0,
    awayScore:   f.goals.away ?? 0,
    date:        f.fixture.date,
    competition: f.league.name,
  };
}

async function parseUpcoming(res: PromiseSettledResult<Response>): Promise<UpcomingMatch | null> {
  if (res.status !== "fulfilled" || !res.value.ok) return null;
  const d = await res.value.json();
  const f = d.response?.[0];
  if (!f) return null;
  const { date, time } = formatMatchTime(f.fixture.date);
  return {
    homeTeam:    f.teams.home.name,
    awayTeam:    f.teams.away.name,
    date, time,
    venue:       f.fixture.venue?.name ?? "",
    competition: f.league.name,
  };
}

async function parseNacionalStanding(res: PromiseSettledResult<Response>, leagueName: string): Promise<Standing | null> {
  if (res.status !== "fulfilled" || !res.value.ok) return null;
  const d = await res.value.json();
  const s = d.response?.[0]?.league?.standings?.[0]?.find(
    (t: Record<string, unknown>) => (t.team as Record<string, unknown>)?.id === NACIONAL_TEAM_ID
  );
  if (!s) return null;
  return {
    position: s.rank,
    points:   s.points,
    played:   s.all?.played ?? 0,
    won:      s.all?.win ?? 0,
    drawn:    s.all?.draw ?? 0,
    lost:     s.all?.lose ?? 0,
    league:   leagueName,
  };
}

async function fetchNacional(): Promise<SportsData["nacional"]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    return { lastMatch: null, nextMatch: null, standing: null, error: "Add API_FOOTBALL_KEY to .env.local" };
  }

  const headers = { "x-apisports-key": key };

  // Try Liga Betplay first (fixtures scoped to league so Copa Lib fallback is meaningful)
  const [lr, nr, sr] = await Promise.allSettled([
    fetch(`${FOOTBALL_API_BASE}/fixtures?team=${NACIONAL_TEAM_ID}&league=${LIGA_BETPLAY_ID}&last=1`, { headers, next: { revalidate: 0 } }),
    fetch(`${FOOTBALL_API_BASE}/fixtures?team=${NACIONAL_TEAM_ID}&league=${LIGA_BETPLAY_ID}&next=1`, { headers, next: { revalidate: 0 } }),
    fetch(`${FOOTBALL_API_BASE}/standings?team=${NACIONAL_TEAM_ID}&season=2025&league=${LIGA_BETPLAY_ID}`, { headers, next: { revalidate: 0 } }),
  ]);

  let lastMatch = await parseFixture(lr);
  let nextMatch = await parseUpcoming(nr);
  let standing  = await parseNacionalStanding(sr, "Liga BetPlay");

  // Copa Libertadores fallback — runs only when Liga Betplay has no data
  if (!lastMatch || !nextMatch || !standing) {
    const [clr, cnr, csr] = await Promise.allSettled([
      fetch(`${FOOTBALL_API_BASE}/fixtures?team=${NACIONAL_TEAM_ID}&league=${COPA_LIBERTADORES_ID}&last=1`, { headers, next: { revalidate: 0 } }),
      fetch(`${FOOTBALL_API_BASE}/fixtures?team=${NACIONAL_TEAM_ID}&league=${COPA_LIBERTADORES_ID}&next=1`, { headers, next: { revalidate: 0 } }),
      fetch(`${FOOTBALL_API_BASE}/standings?team=${NACIONAL_TEAM_ID}&season=2025&league=${COPA_LIBERTADORES_ID}`, { headers, next: { revalidate: 0 } }),
    ]);
    if (!lastMatch) lastMatch = await parseFixture(clr);
    if (!nextMatch) nextMatch = await parseUpcoming(cnr);
    if (!standing)  standing  = await parseNacionalStanding(csr, "Copa Libertadores");
  }

  return { lastMatch, nextMatch, standing, error: null };
}

// ─── Lakers (BallDontLie) ────────────────────────────────────────────────────

const LAKERS_TEAM_ID = 14;
const BDL_BASE       = "https://api.balldontlie.io/v1";

async function fetchLakers(): Promise<SportsData["lakers"]> {
  const bdlKey = process.env.BALLDONTLIE_API_KEY;
  const headers: Record<string, string> = bdlKey
    ? { Authorization: bdlKey }
    : {};

  const todayStr     = today();
  const yesterdayStr = yesterday();

  const [lastRes, nextRes, standRes] = await Promise.allSettled([
    fetch(`${BDL_BASE}/games?team_ids[]=${LAKERS_TEAM_ID}&per_page=5&end_date=${yesterdayStr}`, { headers, next: { revalidate: 0 } }),
    fetch(`${BDL_BASE}/games?team_ids[]=${LAKERS_TEAM_ID}&per_page=1&start_date=${todayStr}`,   { headers, next: { revalidate: 0 } }),
    fetch(`${BDL_BASE}/standings?season=2024&team_ids[]=${LAKERS_TEAM_ID}`,                      { headers, next: { revalidate: 0 } }),
  ]);

  let lastGame: GameResult | null = null;
  if (lastRes.status === "fulfilled" && lastRes.value.ok) {
    const d = await lastRes.value.json();
    const games: Record<string, unknown>[] = d.data ?? [];
    const g = games[games.length - 1];
    if (g) {
      const homeTeam = g.home_team as Record<string, unknown>;
      const awayTeam = g.visitor_team as Record<string, unknown>;
      const isHome   = homeTeam?.id === LAKERS_TEAM_ID;
      const lakersScore   = Number(isHome ? g.home_team_score : g.visitor_team_score);
      const opponentScore = Number(isHome ? g.visitor_team_score : g.home_team_score);
      const oppTeam = isHome ? awayTeam : homeTeam;
      lastGame = {
        opponent:      String(oppTeam?.full_name ?? oppTeam?.name ?? "Unknown"),
        lakersScore,
        opponentScore,
        win:           lakersScore > opponentScore,
        date:          String(g.date ?? "").split("T")[0],
      };
    }
  } else if (lastRes.status === "rejected") {
    console.error("[sports/lakers/lastGame]", lastRes.reason);
  }

  let nextGame: UpcomingGame | null = null;
  if (nextRes.status === "fulfilled" && nextRes.value.ok) {
    const d = await nextRes.value.json();
    const g = d.data?.[0] as Record<string, unknown> | undefined;
    if (g) {
      const homeTeam = g.home_team as Record<string, unknown>;
      const awayTeam = g.visitor_team as Record<string, unknown>;
      const isHome   = homeTeam?.id === LAKERS_TEAM_ID;
      const oppTeam  = isHome ? awayTeam : homeTeam;
      const { date, time } = formatMatchTime(String(g.date ?? ""), "America/Los_Angeles");
      nextGame = {
        opponent: String(oppTeam?.full_name ?? oppTeam?.name ?? "TBD"),
        date,
        time: time ? `${time} PT` : "",
      };
    }
  }

  let standing: LakersStanding | null = null;
  if (standRes.status === "fulfilled" && standRes.value.ok) {
    const d = await standRes.value.json();
    const s = d.data?.[0] as Record<string, unknown> | undefined;
    if (s) {
      standing = {
        conference: String(s.conference ?? "West"),
        position:   Number(s.conference_rank ?? 0),
        wins:       Number(s.wins ?? 0),
        losses:     Number(s.losses ?? 0),
      };
    }
  }

  return { lastGame, nextGame, standing, error: null };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json(cache.data);
  }

  const [nacional, lakers] = await Promise.allSettled([
    fetchNacional(),
    fetchLakers(),
  ]);

  const data: SportsData = {
    nacional: nacional.status === "fulfilled"
      ? nacional.value
      : { lastMatch: null, nextMatch: null, standing: null, error: "Failed to load" },
    lakers: lakers.status === "fulfilled"
      ? lakers.value
      : { lastGame: null, nextGame: null, standing: null, error: "Failed to load" },
    fetchedAt: new Date().toISOString(),
  };

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}
