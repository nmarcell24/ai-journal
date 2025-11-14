// app/api/generate-questions/route.ts (renamed file)
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get topic from request body
    const { topic = "General" } = await req.json();

    // Try to fetch the user's most recent journal entry for this topic
    let lastAnswerSnippet = "";
    if (user) {
      const { data: last, error } = await supabase
        .from("journals")
        .select("answers, created_at, topic")
        .eq("user_id", user.id)
        .eq("topic", topic) // Filter by the same topic
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && last?.answers?.length) {
        const longest =
          last.answers
            .slice()
            .sort((a: string, b: string) => b.length - a.length)[0] ?? "";
        lastAnswerSnippet = longest.slice(0, 300);
      }
    } 

    const baseInstr =
      `You are a therapist who helps people reflect on ${topic}. Return EXACTLY 3 short, distinct questions as pure JSON array: ` +
      '[{"text":"..."},{"text":"..."},{"text":"..."}]. No extra text.';

    console.log(baseInstr);

    const withFollowUp = lastAnswerSnippet
      ? [
          baseInstr,
          "",
          "From the 3 questions:",
          "• Exactly 1 must be a gentle follow-up to this prior theme (do NOT quote it verbatim):",
          JSON.stringify({ prior_answer_excerpt: lastAnswerSnippet }),
          `• The other 2 should be ${topic} reflective questions.`,
        ].join("\n")
      : baseInstr;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a supportive therapist. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: withFollowUp,
        },
      ],
      response_format: { type: "json_object" },
    });

    const text = resp.choices[0]?.message?.content ?? "[]";
    let raw: Array<{ text: string }> = [];
    try {
      const parsed = JSON.parse(text);
      raw = Array.isArray(parsed) ? parsed : parsed.questions || [];
    } catch (e) {
      console.error("Failed to parse questions:", e);
      raw = [];
    }

    // Fallback if model didn't return parseable JSON
    if (raw.length === 0) {
      raw = [
        { text: "What emotion feels most present for you right now?" },
        { text: "What felt meaningful or difficult in the past day?" },
        { text: "What is one small step that could help you today?" },
      ];
    }

    const questions = raw
      .slice(0, 3)
      .map((q, i) => ({ id: String(i + 1), text: String(q.text ?? "") }));

    return NextResponse.json({ questions });
  } catch (e: any) {
    console.error("Error generating questions:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to generate questions" },
      { status: 500 }
    );
  }
}
