"use client";

import { useState, useEffect } from "react";
import type { SportsData } from "@/app/api/sports/route";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-raised animate-pulse rounded ${className ?? ""}`} />;
}

// ─── Nacional panel ───────────────────────────────────────────────────────────

function NacionalPanel({ data }: { data: SportsData["nacional"] | null }) {
  if (!data) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (data.error) {
    return (
      <p className="text-[10px] font-mono text-muted/40 leading-relaxed">{data.error}</p>
    );
  }

  const { lastMatch, nextMatch, standing } = data;

  const nacIsHome = lastMatch?.homeTeam.toLowerCase().includes("nacional");
  const nacScore  = nacIsHome ? lastMatch?.homeScore : lastMatch?.awayScore;
  const oppScore  = nacIsHome ? lastMatch?.awayScore : lastMatch?.homeScore;
  const opponent  = nacIsHome ? lastMatch?.awayTeam  : lastMatch?.homeTeam;
  const win = nacScore !== undefined && oppScore !== undefined && nacScore > oppScore;
  const draw = nacScore !== undefined && oppScore !== undefined && nacScore === oppScore;

  return (
    <div className="space-y-2.5">
      {lastMatch && (
        <div>
          <p className="text-[9px] font-mono text-muted/50 uppercase tracking-widest mb-1">Last</p>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold font-mono ${win ? "text-teal" : draw ? "text-muted" : "text-danger"}`}>
              {nacScore}–{oppScore}
            </span>
            <span className="text-[10px] text-muted/60 truncate">vs {opponent}</span>
            <span className={`text-[9px] font-mono ml-auto ${win ? "text-teal" : draw ? "text-muted/60" : "text-danger"}`}>
              {win ? "W" : draw ? "D" : "L"}
            </span>
          </div>
          <p className="text-[9px] font-mono text-muted/40 mt-0.5">{lastMatch.competition}</p>
        </div>
      )}

      {nextMatch && (
        <div>
          <p className="text-[9px] font-mono text-muted/50 uppercase tracking-widest mb-1">Next</p>
          <p className="text-[10px] text-bright truncate">
            vs {nextMatch.homeTeam.toLowerCase().includes("nacional") ? nextMatch.awayTeam : nextMatch.homeTeam}
          </p>
          <p className="text-[9px] font-mono text-muted/60">{nextMatch.date}{nextMatch.time ? `, ${nextMatch.time}` : ""}</p>
          <p className="text-[9px] font-mono text-muted/40 mt-0.5">{nextMatch.competition}</p>
        </div>
      )}

      {standing && (
        <div className="flex items-center gap-2 pt-1 border-t border-line/30">
          <span className="text-[10px] font-mono text-bright font-semibold">#{standing.position}</span>
          <span className="text-[9px] font-mono text-muted/60">{standing.league}</span>
          <span className="text-[9px] font-mono text-muted/50 ml-auto">
            {standing.won}W {standing.drawn}D {standing.lost}L · {standing.points}pts
          </span>
        </div>
      )}

      {!lastMatch && !nextMatch && !standing && (
        <div className="space-y-0.5">
          <p className="text-[10px] font-mono text-muted/60">⏸ Off season</p>
          <p className="text-[9px] font-mono text-muted/35">Next season updates will appear here automatically</p>
        </div>
      )}
    </div>
  );
}

// ─── Lakers panel ─────────────────────────────────────────────────────────────

function LakersPanel({ data }: { data: SportsData["lakers"] | null }) {
  if (!data) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (data.error) {
    return <p className="text-[10px] font-mono text-muted/40">{data.error}</p>;
  }

  const { lastGame, nextGame, standing } = data;

  return (
    <div className="space-y-2.5">
      {lastGame && (
        <div>
          <p className="text-[9px] font-mono text-muted/50 uppercase tracking-widest mb-1">Last</p>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold font-mono ${lastGame.win ? "text-[#FDB927]" : "text-danger"}`}>
              {lastGame.lakersScore}–{lastGame.opponentScore}
            </span>
            <span className="text-[10px] text-muted/60 truncate">vs {lastGame.opponent}</span>
            <span className={`text-[9px] font-mono ml-auto ${lastGame.win ? "text-[#FDB927]" : "text-danger"}`}>
              {lastGame.win ? "W" : "L"}
            </span>
          </div>
          <p className="text-[9px] font-mono text-muted/40 mt-0.5">{lastGame.date}</p>
        </div>
      )}

      {nextGame && (
        <div>
          <p className="text-[9px] font-mono text-muted/50 uppercase tracking-widest mb-1">Next</p>
          <p className="text-[10px] text-bright truncate">vs {nextGame.opponent}</p>
          <p className="text-[9px] font-mono text-muted/60">{nextGame.date}{nextGame.time ? `, ${nextGame.time}` : ""}</p>
        </div>
      )}

      {standing && (
        <div className="flex items-center gap-2 pt-1 border-t border-line/30">
          <span className="text-[10px] font-mono text-bright font-semibold">#{standing.position}</span>
          <span className="text-[9px] font-mono text-muted/60">{standing.conference}</span>
          <span className="text-[9px] font-mono text-muted/50 ml-auto">
            {standing.wins}–{standing.losses}
          </span>
        </div>
      )}

      {!lastGame && !nextGame && !standing && (
        <div className="space-y-0.5">
          <p className="text-[10px] font-mono text-muted/60">⏸ Off season</p>
          <p className="text-[9px] font-mono text-muted/35">Next season updates will appear here automatically</p>
        </div>
      )}
    </div>
  );
}

// ─── SportsWidget ─────────────────────────────────────────────────────────────

export function SportsWidget() {
  const [data, setData] = useState<SportsData | null>(null);

  useEffect(() => {
    fetch("/api/sports")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {/* best-effort */});
  }, []);

  return (
    <div className="bg-card border border-line rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-raised/40">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Sports</p>
        {data?.fetchedAt && (
          <span className="text-[9px] font-mono text-muted/40">
            {new Date(data.fetchedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-line/40">
        {/* Atletico Nacional */}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-base leading-none">⚽</span>
            <div>
              <p className="text-[10px] font-mono font-semibold text-teal leading-none">Atl. Nacional</p>
              <p className="text-[9px] font-mono text-muted/50">Colombia</p>
            </div>
          </div>
          <NacionalPanel data={data?.nacional ?? null} />
        </div>

        {/* Lakers */}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-base leading-none">🏀</span>
            <div>
              <p className="text-[10px] font-mono font-semibold leading-none" style={{ color: "#FDB927" }}>
                Lakers
              </p>
              <p className="text-[9px] font-mono text-muted/50">NBA</p>
            </div>
          </div>
          <LakersPanel data={data?.lakers ?? null} />
        </div>
      </div>
    </div>
  );
}
