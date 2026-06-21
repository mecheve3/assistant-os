"use client";

import { useState, useEffect, useRef } from "react";
import { AIInsight } from "@/types";
import { RefreshCw, Zap, AlertTriangle, TrendingUp, BarChart2, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

const INSIGHT_STYLE: Record<
  string,
  { classes: string; Icon: React.ElementType; iconClass: string }
> = {
  focus:       { classes: "border-teal/20 bg-teal/5",  Icon: Zap,           iconClass: "text-teal" },
  warning:     { classes: "border-warn/20 bg-warn/5",  Icon: AlertTriangle, iconClass: "text-warn" },
  opportunity: { classes: "border-info/20 bg-info/5",  Icon: TrendingUp,    iconClass: "text-info" },
  pattern:     { classes: "border-ai/20 bg-ai/5",      Icon: BarChart2,     iconClass: "text-ai" },
};

interface ConvMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

const RATE_LIMIT_MS = 60_000;
const MAX_VISIBLE = 10;

export function AIBriefingCard() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const lastFetchAt = useRef(0);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split("T")[0];

  // Load today's conversation history on mount
  useEffect(() => {
    supabase
      .from("ai_conversations")
      .select("id, role, content, created_at")
      .eq("date", today)
      .eq("context", "briefing")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ConvMessage[]);
      });
  }, [today]);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const loadBriefing = async () => {
    const now = Date.now();
    if (now - lastFetchAt.current < RATE_LIMIT_MS) return;
    lastFetchAt.current = now;
    setLoading(true);

    try {
      const res = await fetch("/api/ai-briefing", { method: "POST" });
      const data = await res.json();
      if (Array.isArray(data.insights)) {
        setInsights(data.insights);
        setGeneratedAt(data.generated_at ?? null);
      }
    } catch {
      // briefing is best-effort
    } finally {
      setLoading(false);
      let remaining = Math.round(RATE_LIMIT_MS / 1000);
      setCooldown(remaining);
      const tick = () => {
        remaining -= 1;
        setCooldown(remaining);
        if (remaining > 0) cooldownTimer.current = setTimeout(tick, 1000);
      };
      cooldownTimer.current = setTimeout(tick, 1000);
    }
  };

  useEffect(() => {
    loadBriefing();
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;
    setInputText("");

    const userMsg: ConvMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Persist user message
    await supabase.from("ai_conversations").insert({
      date: today,
      context: "briefing",
      role: "user",
      content: text,
    });

    setIsTyping(true);
    try {
      const res = await fetch("/api/ai-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationMode: true,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          userMessage: text,
          insights,
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Sorry, I couldn't respond right now.";

      // Persist assistant reply
      const { data: saved } = await supabase
        .from("ai_conversations")
        .insert({
          date: today,
          context: "briefing",
          role: "assistant",
          content: reply,
        })
        .select("id, role, content, created_at")
        .single();

      setMessages((prev) => [
        ...prev,
        (saved as ConvMessage) ?? { role: "assistant", content: reply },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const sorted = [...insights].sort((a, b) => a.priority - b.priority);
  const visibleMessages = messages.slice(-MAX_VISIBLE);

  return (
    <div className="bg-card border border-line rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted">
            AI Daily Briefing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {generatedAt && !loading && (
            <span className="text-[9px] font-mono text-muted/50">
              {new Date(generatedAt).toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={loadBriefing}
            disabled={loading || cooldown > 0}
            title={cooldown > 0 ? `Refresh in ${cooldown}s` : "Refresh briefing"}
            className="flex items-center gap-1 text-muted hover:text-bright disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            {cooldown > 0 && !loading && (
              <span className="text-[9px] font-mono text-muted/60">{cooldown}s</span>
            )}
          </button>
        </div>
      </div>

      {/* Insights loading skeleton */}
      {loading && insights.length === 0 && (
        <div className="space-y-2 py-1">
          {[85, 95, 70].map((w, i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-3.5 h-3.5 bg-raised rounded shrink-0 mt-0.5" />
              <div className="h-3 bg-raised rounded" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      )}

      {!loading && insights.length === 0 && (
        <p className="text-xs text-muted font-mono text-center py-4">
          No briefing loaded — hit refresh.
        </p>
      )}

      {sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((insight, i) => {
            const style = INSIGHT_STYLE[insight.type] ?? INSIGHT_STYLE.focus;
            const { Icon } = style;
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-2.5 py-2 rounded border text-xs leading-relaxed ${style.classes}`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${style.iconClass}`} />
                <span className="text-bright">{insight.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Conversation thread — always visible once briefing loaded */}
      {insights.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-4 mb-3">
            <div className="flex-1 border-t border-line/30" />
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted/40">
              Conversation
            </p>
            <div className="flex-1 border-t border-line/30" />
          </div>

          {/* Messages */}
          {(visibleMessages.length > 0 || isTyping) && (
            <div className="space-y-2 max-h-48 overflow-y-auto mb-3 pr-1">
              {visibleMessages.map((msg, i) => (
                <div
                  key={msg.id ?? i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={[
                      "max-w-[85%] px-2.5 py-1.5 rounded text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-teal/10 text-bright border border-teal/20"
                        : "bg-raised text-muted/90 border border-line/60",
                    ].join(" ")}
                  >
                    {msg.role === "assistant" && (
                      <span className="text-[9px] font-mono text-ai mr-1">◆</span>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-raised border border-line/60 px-2.5 py-1.5 rounded text-xs text-muted/50 font-mono">
                    <span className="text-ai">◆</span> thinking…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask a follow-up…"
              disabled={isTyping}
              className="flex-1 bg-base border border-line rounded px-2.5 py-1.5 text-xs text-bright placeholder:text-muted/40 focus:outline-none focus:border-teal disabled:opacity-40"
            />
            <button
              onClick={sendMessage}
              disabled={isTyping || !inputText.trim()}
              className="flex items-center justify-center w-7 h-7 bg-teal/10 text-teal rounded hover:bg-teal/20 disabled:opacity-40 transition-colors shrink-0"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
