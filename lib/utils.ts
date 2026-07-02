import { format, formatDistanceToNow, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrency(amount: number, currency: "COP" | "USD"): string {
  return currency === "COP" ? formatCOP(amount) : formatUSD(amount);
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd MMM yyyy");
}

export function formatDateDMY(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy");
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM");
}

export function todayISO(): string {
  // Always return the date in Bogotá time (UTC-5, no DST) — avoids habit reset at midnight UTC
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Bogota" });
}

export function getDaysSince(dateStr: string): number {
  return differenceInDays(new Date(), parseISO(dateStr));
}

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es });
}

// ─── Project heartbeat ────────────────────────────────────────────────────────

export interface HeartbeatInfo {
  days: number | null;
  label: string;
  colorClass: string;
  bgClass: string;
  isActive: boolean;
}

export function getHeartbeatInfo(lastUpdateDate: string | null): HeartbeatInfo {
  if (!lastUpdateDate) {
    return {
      days: null,
      label: "No updates yet",
      colorClass: "text-muted",
      bgClass: "bg-muted/40",
      isActive: false,
    };
  }
  const days = getDaysSince(lastUpdateDate);
  if (days <= 2) {
    return { days, label: "Active", colorClass: "text-teal", bgClass: "bg-teal", isActive: true };
  }
  if (days <= 7) {
    return { days, label: "Slowing", colorClass: "text-warn", bgClass: "bg-warn", isActive: false };
  }
  if (days <= 14) {
    return { days, label: "Stalled", colorClass: "text-danger", bgClass: "bg-danger", isActive: false };
  }
  return { days, label: "Flatline ⚠", colorClass: "text-danger", bgClass: "bg-danger", isActive: false };
}

// ─── Cognitive load ───────────────────────────────────────────────────────────

export function cognitiveLoadLabel(score: number): string {
  if (score <= 2) return "Low";
  if (score <= 5) return "Medium";
  if (score <= 7) return "High";
  return "Overwhelmed";
}

export function cognitiveLoadColor(score: number): string {
  if (score <= 2) return "text-teal";
  if (score <= 5) return "text-warn";
  if (score <= 7) return "text-danger";
  return "text-danger";
}

// ─── Momentum ─────────────────────────────────────────────────────────────────

export function momentumColor(score: number): string {
  if (score >= 8) return "text-teal";
  if (score >= 5) return "text-warn";
  return "text-danger";
}

// ─── Stage display ────────────────────────────────────────────────────────────

export const STAGE_ORDER = [
  "idea",
  "validation",
  "building",
  "revenue",
  "scaling",
  "paused",
  "killed",
] as const;

export function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    idea: "Idea",
    validation: "Validation",
    building: "Building",
    revenue: "Revenue",
    scaling: "Scaling",
    paused: "Paused",
    killed: "Killed",
  };
  return labels[stage] ?? stage;
}

// ─── Live forex ───────────────────────────────────────────────────────────────

export async function getLiveUSDtoCOP(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=COP",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const data = await res.json();
    const rate = Number(data.rates?.COP ?? 0);
    if (!rate) throw new Error("no COP rate");
    return rate;
  } catch {
    return Number(process.env.USD_TO_COP_RATE ?? "4200");
  }
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
