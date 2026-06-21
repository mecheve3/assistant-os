import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  try {
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .upsert([
        { name: "Sleep Apnea Belt", emoji: "🫁", stage: "validation", category: "startup", description: "Hardware medical device for passive sleep apnea monitoring.", goal_2025: "Complete prototype v1 and validate with 10 real users", color_hex: "#3b82f6" },
        { name: "Serenno", emoji: "💚", stage: "validation", category: "startup", description: "Anti-nausea wristbands using acupressure.", goal_2025: "Validate product-market fit and secure first 50 pre-orders", color_hex: "#00d4aa" },
        { name: "Godfather's Table", emoji: "♟", stage: "building", category: "side_project", description: "Online strategy game with negotiation and political simulation.", goal_2025: "Ship MVP and onboard first 100 players", color_hex: "#8b5cf6" },
        { name: "Crypto Bot Fleet", emoji: "🤖", stage: "revenue", category: "side_project", description: "Automated crypto trading bots on multiple exchanges.", goal_2025: "Reach $2,000/month in consistent bot revenue", color_hex: "#f59e0b" },
        { name: "SmartCryptoTraderHQ", emoji: "📈", stage: "revenue", category: "side_project", description: "Online crypto trading courses from beginner to algo trading.", goal_2025: "Hit $3,000/month and launch advanced course", color_hex: "#00d4aa" },
        { name: "Day Job", emoji: "💼", stage: "scaling", category: "day_job", description: "Product Owner - payroll software for US entertainment industry.", goal_2025: "Deliver Q3 roadmap on time", color_hex: "#6b7280" },
      ])
      .select();

    if (projectError) {
      console.error("Project seed error:", JSON.stringify(projectError));
      return NextResponse.json({ error: "Projects failed", details: JSON.stringify(projectError) }, { status: 500 });
    }

    const { error: habitError } = await supabase.from("habits").upsert([
      { name: "Morning routine", category: "health", frequency: "daily", target_streak: 30 },
      { name: "Exercise", category: "health", frequency: "daily", target_streak: 30 },
      { name: "Review tasks", category: "productivity", frequency: "daily", target_streak: 30 },
      { name: "No unnecessary spending", category: "finance", frequency: "daily", target_streak: 30 },
      { name: "Read / learn 20 min", category: "learning", frequency: "daily", target_streak: 30 },
      { name: "Project deep work block", category: "productivity", frequency: "weekdays", target_streak: 20 },
    ]);

    if (habitError) {
      console.error("Habit seed error:", JSON.stringify(habitError));
      return NextResponse.json({ error: "Habits failed", details: JSON.stringify(habitError) }, { status: 500 });
    }

    const { error: accountError } = await supabase.from("finances_accounts").upsert([
      { name: "Bancolombia Checking", type: "checking", currency: "COP", current_balance: 0, institution: "Bancolombia" },
      { name: "Nequi", type: "checking", currency: "COP", current_balance: 0, institution: "Nequi" },
      { name: "Credit Card 1", type: "credit_card", currency: "COP", current_balance: 0 },
      { name: "Binance", type: "crypto", currency: "USD", current_balance: 0, institution: "Binance" },
      { name: "Investment Portfolio", type: "investment", currency: "USD", current_balance: 0 },
    ]);

    if (accountError) {
      console.error("Account seed error:", JSON.stringify(accountError));
      return NextResponse.json({ error: "Accounts failed", details: JSON.stringify(accountError) }, { status: 500 });
    }

    // ── Seed debts (Phase 4) ──────────────────────────────────────────────────
    const { error: debtError } = await supabase.from("finances_debts").upsert([
      {
        name: "Crédito de Vivienda",
        institution: null,
        total_amount: 10_369_670,
        current_balance: 10_369_670,
        currency: "COP",
        interest_rate: null,
        minimum_payment: 598_791,
        monthly_payment: 598_791,
        type: "mortgage",
        active: true,
      },
      {
        name: "Tarjeta de Crédito",
        institution: null,
        total_amount: 61_800,
        current_balance: 61_800,
        currency: "COP",
        interest_rate: null,
        minimum_payment: 61_800,
        minimum_payment_cop: 61_800,
        minimum_payment_usd: 48,
        balance_usd: 432,
        type: "credit_card",
        active: true,
      },
    ]);

    if (debtError) {
      console.error("Debt seed error:", JSON.stringify(debtError));
      // Non-fatal: migration may not have been run yet
    }

    const cryptoBotId = projectData?.find((p) => p.name === "Crypto Bot Fleet")?.id ?? null;
    const smartCryptoId = projectData?.find((p) => p.name === "SmartCryptoTraderHQ")?.id ?? null;

    const { count: existingGoals } = await supabase
      .from("goals")
      .select("*", { count: "exact", head: true });

    if ((existingGoals ?? 0) === 0) {
      await supabase.from("goals").insert([
        {
          title: "Pay off Tarjeta de Crédito",
          category: "financial",
          target_value: 61800,
          current_value: 61800,
          unit: "COP",
          status: "achieved",
          target_date: "2026-06-30",
        },
        {
          title: "Build travel savings fund",
          category: "financial",
          target_value: 5000000,
          current_value: 0,
          unit: "COP",
          status: "active",
          target_date: "2026-12-31",
        },
        {
          title: "Crypto Bot Fleet — $2,000/month revenue",
          category: "project",
          target_value: 2000,
          current_value: 0,
          unit: "USD/month",
          status: "active",
          target_date: "2026-12-31",
          project_id: cryptoBotId,
        },
        {
          title: "Complete 30-day habit streak",
          category: "health",
          target_value: 30,
          current_value: 0,
          unit: "days",
          status: "active",
          target_date: "2026-08-31",
        },
        {
          title: "SmartCryptoTraderHQ — $3,000/month",
          category: "project",
          target_value: 3000,
          current_value: 0,
          unit: "USD/month",
          status: "active",
          target_date: "2026-12-31",
          project_id: smartCryptoId,
        },
      ]);
    }

    return NextResponse.json({
      message: "Seed complete — 6 projects, 6 habits, 5 accounts, 2 debts, 5 goals created.",
      projects: projectData?.length,
      debtNote: debtError
        ? "⚠ Debt seeding failed — run supabase/migrations/002_phase4_finance.sql first."
        : "✓ Debts seeded.",
      goalNote: (existingGoals ?? 0) > 0 ? "ℹ Goals already exist — skipped." : "✓ Goals seeded.",
    });

  } catch (error) {
    console.error("Seed error:", JSON.stringify(error));
    return NextResponse.json({ error: "Seed failed", details: JSON.stringify(error) }, { status: 500 });
  }
}