// app/api/generate-suggestions/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type Suggestion = { title: string; rationale: string; steps: string[] };

export async function POST(req: Request) {
  try {
    const {
      questions = [],
      answers = [],
      topic,
      journalEntry,
    } = await req.json();

    let prompt = "";

    if (topic === "Custom" && journalEntry) {
      prompt = [
        "You are a supportive therapist coach.",
        "Based on the entry, produce EXACTLY 1 practical suggestion as pure JSON array:",
        '[{"title":"...","rationale":"...","steps":["...","...","..."]}]',
        "Keep items concise; no diagnosis/medical claims.",
        `Entry: ${JSON.stringify(journalEntry)}`,
      ].join("\n");
    } else {
      prompt = [
        "You are a supportive therapist coach.",
        "Based on the answers, produce EXACTLY 3 practical suggestions as pure JSON array:",
        '[{"title":"...","rationale":"...","steps":["...","...","..."]}, ...]',
        "Keep items concise; no diagnosis/medical claims.",
        `Questions: ${JSON.stringify(questions)}`,
        `Answers: ${JSON.stringify(answers)}`,
      ].join("\n");
    }

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-4o", "gpt-3.5-turbo"
      messages: [
        {
          role: "system",
          content:
            "You are a supportive therapist coach. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" }, // This ensures JSON response
    });

    const text = resp.choices[0]?.message?.content ?? "[]";

    let parsed = [] as Suggestion[];
    try {
      const jsonData = JSON.parse(text);
      // Handle if the response wraps the array in an object
      parsed = Array.isArray(jsonData) ? jsonData : jsonData.suggestions || [];
    } catch (e) {
      console.error("Failed to parse suggestions from AI response:", text);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const suggestions = parsed.slice(0, 3).map((s, i) => ({
      id: String(i + 1),
      title: String(s.title),
      rationale: String(s.rationale),
      steps: (Array.isArray(s.steps) ? s.steps : []).slice(0, 3).map(String),
    }));

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    console.error("Error in generate-suggestions:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
