import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TASK_PROMPTS: Record<string, string> = {
  sort_parking_lot: `You are sorting a parking lot of captured items for an entrepreneur.
For each item, suggest:
- category: "task" | "idea" | "note" | "link" | "question"
- suggested_project: project name or null if none fits
- action: one-line actionable suggestion

Return ONLY valid JSON: {"items": [{"id": "...", "category": "...", "suggested_project": "...", "action": "..."}]}`,

  weekly_review_summary: `You are writing a weekly review summary for an entrepreneur running 6 projects.
Be direct, strategic, and specific. Identify patterns. Do not praise effort — assess results.
Return ONLY valid JSON: {"summary": "1 paragraph max 80 words", "recommendations": ["string","string","string"]}`,

  debt_optimization: `You are a financial advisor analyzing debt payoff strategy.
Compare snowball vs avalanche for the given debts.
Return ONLY valid JSON: {"recommended_strategy": "snowball"|"avalanche", "reasoning": "max 30 words", "payoff_order": ["debt name",...], "monthly_extra_needed": number}`,

  finance_advisor: `You are Miguel's personal financial advisor. Miguel is an entrepreneur in Medellín, Colombia with:
- A housing credit (crédito de vivienda) with $598,791 COP monthly payment
- A credit card with both COP and USD balance
- Gross salary of ~$10,000,000 COP/month with 9% deductions (pensión 4%, salud 4%, solidaridad 1%)
- Irregular additional income from crypto bots and online courses
- Goals: pay down debt, save for international travel, build investment portfolio

Analyze the financial context provided and return exactly 3 specific, actionable recommendations. Reference actual numbers from the data — no generic advice.
Return ONLY valid JSON:
{"recommendations": [{"title": "max 5 words", "action": "max 30 words, what exactly to do", "impact": "max 20 words, quantified if possible", "priority": 1|2|3}]}`,

  habit_pattern: `You are analyzing habit completion patterns over 4 weeks.
Identify which habits are consistently missed and on which days.
Return ONLY valid JSON: {"patterns": [{"habit": "name", "issue": "description", "suggestion": "max 15 words"}]}`,

  parking_lot_sort: `You are helping sort a parking lot of captured items for an entrepreneur named Miguel in Medellín managing multiple projects.
For each item, decide the best category and which project it belongs to (if any). Be decisive — every item gets a category.
Return ONLY valid JSON: {"suggestions": [{"id": "the-exact-uuid", "category": "task"|"idea"|"note"|"link", "project_name": "exact project name or null", "reasoning": "one sentence"}]}`,

  weekly_review: `You are Miguel's weekly operating system advisor. He is an entrepreneur in Medellín managing 6 projects plus a day job. Review his week data and give a sharp, honest assessment. No cheerleading. Identify what he is avoiding, what is working, what needs a decision. The one_thing should be the single highest-leverage action for Monday morning — specific and actionable.
Return ONLY valid JSON: {"summary": "1 paragraph max 80 words direct and honest", "patterns": ["pattern1", "pattern2", "pattern3"], "recommendations": ["specific action 1", "specific action 2", "specific action 3"], "one_thing": "the single most important action for Monday morning, concrete and specific"}`,

  expense_projection: `You are Miguel's personal financial advisor analyzing his recurring expense structure. Miguel is in Medellín, Colombia. His gross salary is ~$10,000,000 COP/month with ~9% deductions (~$900,000). He has fixed monthly expenses and irregular annual expenses. His goals: pay down debt, save for international travel, build investment portfolio.

Given his fixed monthly expenses and annual irregular expenses provided in the context, identify:
1. The 3 most financially stressful months (months with annual expenses on top of monthly fixed costs)
2. A realistic monthly savings target for a travel goal (aim for 1-2 international trips/year at ~$5,000,000 COP each)
3. Up to 3 specific expense optimization opportunities (subscriptions to cancel, expenses to reduce, better alternatives)

Be specific with amounts in COP. No generic advice.
Return ONLY valid JSON: {"stressful_months": [{"month": "Month name", "extra_cost": number, "reason": "max 15 words"}], "monthly_savings_target": number, "optimization_tips": ["specific tip with COP amount", "specific tip", "specific tip"]}`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, context } = body as {
      task: keyof typeof TASK_PROMPTS;
      context: unknown;
    };

    if (!task || !TASK_PROMPTS[task]) {
      return NextResponse.json({ error: "Unknown task type" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Context: ${JSON.stringify(context, null, 2)}`,
        },
      ],
      system: TASK_PROMPTS[task],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    // Strip markdown code fences if Claude wraps JSON in ```json...``` blocks
    const cleaned = raw
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    let result: unknown;
    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error("[ai-analyze] JSON parse failed for task:", task, "| raw:", raw.slice(0, 300));
      result = { raw };
    }

    return NextResponse.json({ result, task, generated_at: new Date().toISOString() });
  } catch (error) {
    console.error("AI analyze error:", error);
    return NextResponse.json(
      { error: "Failed to analyze" },
      { status: 500 }
    );
  }
}
