import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/reset-habits
// Wipes all habits + logs and seeds Miguel's real routine.
// Run once via: curl -X POST http://localhost:3000/api/reset-habits
export async function POST() {
  try {
    // Delete all habit logs first (FK constraint)
    await supabase.from("habit_logs").delete().gte("created_at", "1900-01-01");
    // Delete all habits
    await supabase.from("habits").delete().gte("created_at", "1900-01-01");

    // Insert real routine
    const { error } = await supabase.from("habits").insert([
      {
        name: "Check Personal OS",
        category: "productivity",
        frequency: "weekdays",
        frequency_days: null,
        frequency_date: null,
        target_streak: 20,
        active: true,
      },
      {
        name: "Gym workout",
        category: "health",
        frequency: "daily",
        frequency_days: null,
        frequency_date: null,
        target_streak: 30,
        active: true,
      },
      {
        name: "Protein + creatine shake",
        category: "health",
        frequency: "daily",
        frequency_days: null,
        frequency_date: null,
        target_streak: 30,
        active: true,
      },
      {
        name: "Daily shave",
        category: "personal",
        frequency: "weekdays",
        frequency_days: null,
        frequency_date: null,
        target_streak: 20,
        active: true,
      },
      {
        name: "Friday extended shave",
        category: "personal",
        frequency: "weekly",
        frequency_days: ["fri"],
        frequency_date: null,
        target_streak: 8,
        active: true,
      },
      {
        name: "Beard trim",
        category: "personal",
        frequency: "bi-weekly",
        frequency_days: ["wed"],
        frequency_date: null,
        target_streak: 26,
        active: true,
      },
      {
        name: "30 min learning block",
        category: "learning",
        frequency: "weekdays",
        frequency_days: null,
        frequency_date: null,
        target_streak: 20,
        active: true,
      },
      {
        name: "No unnecessary spending",
        category: "finance",
        frequency: "daily",
        frequency_days: null,
        frequency_date: null,
        target_streak: 30,
        active: true,
      },
      {
        name: "Grocery run",
        category: "personal",
        frequency: "weekly",
        frequency_days: ["mon", "thu"],
        frequency_date: null,
        target_streak: 8,
        active: true,
      },
    ]);

    if (error) {
      console.error("[reset-habits] insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Habits reset. 9 habits created: Check Personal OS, Gym workout, Protein + creatine shake, Daily shave, Friday extended shave, Beard trim, 30 min learning block, No unnecessary spending, Grocery run.",
    });
  } catch (err) {
    console.error("[reset-habits] unexpected error:", err);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
