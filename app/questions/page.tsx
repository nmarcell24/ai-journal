"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Q = { id: string; text: string };
type Suggestion = {
  id: string;
  title: string;
  rationale: string;
  steps: string[];
};

const QUOTES = [
  "Small steps still move you forward.",
  "Progress over perfection.",
  "You are doing better than you think.",
  "Breathe. Then take the next tiny step.",
  "Consistency beats intensity.",
  "One action today can change the week.",
  "Be kind to yourself while you grow.",
  "Clarity comes from action.",
];

const TOPICS = [
  "Health",
  "Relationships",
  "Finances",
  "Spirituality/Mind",
  "Career/Work",
  "Impact/Purpose",
];

export default function Questions() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<null | { id: string }>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customJournal, setCustomJournal] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showIntro, setShowIntro] = useState(true);

  // loading overlay phase: 'questions' | 'suggestions' | null
  const [loadingPhase, setLoadingPhase] = useState<
    "questions" | "suggestions" | null
  >(null);
  const [renderOverlay, setRenderOverlay] = useState(false);
  const [dotCount, setDotCount] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFade, setQuoteFade] = useState(false);

  // ===== Overlay animations =====
  useEffect(() => {
    // show/hide overlay with fade
    if (loadingPhase) {
      setRenderOverlay(true);
    } else {
      const t = setTimeout(() => setRenderOverlay(false), 300);
      return () => clearTimeout(t);
    }
  }, [loadingPhase]);

  useEffect(() => {
    if (!renderOverlay || !loadingPhase) return;
    // animated dots
    const dots = setInterval(() => setDotCount((c) => (c + 1) % 4), 450);
    return () => clearInterval(dots);
  }, [renderOverlay, loadingPhase]);

  useEffect(() => {
    if (!renderOverlay || !loadingPhase) return;
    // rotating quotes with fade
    const rot = setInterval(() => {
      setQuoteFade(true);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % QUOTES.length);
        setQuoteFade(false);
      }, 250);
    }, 4000);
    return () => clearInterval(rot);
  }, [renderOverlay, loadingPhase]);

  const overlayTitle =
    loadingPhase === "questions"
      ? "Generating questions"
      : "Generating suggestions";

  // ===== Auth check =====
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/sign-in");
      else setUser(user);
    });
  }, [supabase, router]);

  // ===== Handle topic selection - calls generateQuestions =====
  const handleTopicSelection = async (topic: string) => {
    setSelectedTopic(topic);
    setLoadingPhase("questions");
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      const qs: Q[] = data.questions;
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
    } catch (err: any) {
      alert(
        "Failed to generate questions. Please try again.\n" +
          (err?.message ?? "")
      );
    } finally {
      setLoadingPhase(null);
    }
  };

  const handleCustomMode = () => {
    setIsCustomMode(true);
    setSelectedTopic("Custom");
  };

  // ===== Form handlers =====
  const onChangeAnswer = (idx: number, value: string) =>
    setAnswers((prev) => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });

  const generateSuggestions = async () => {
    setLoadingPhase("suggestions");
    try {
      const payload = isCustomMode
        ? {
            topic: "Custom",
            journalEntry: customJournal,
          }
        : {
            topic: selectedTopic,
            questions: questions.map((q) => q.text),
            answers,
          };

      const res = await fetch("/api/generate-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSuggestions(data.suggestions as Suggestion[]);
    } catch (err: any) {
      alert("Failed to generate suggestions.\n" + (err?.message ?? ""));
    } finally {
      setLoadingPhase(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const journalData = isCustomMode
      ? {
          user_id: user.id,
          topic: "Custom",
          journal_entry: customJournal,
          suggestions,
        }
      : {
          user_id: user.id,
          topic: selectedTopic,
          questions: questions.map((q) => q.text),
          answers,
          suggestions,
        };

    const { error } = await supabase.from("journals").insert(journalData);
    if (error) return alert(error.message);
    router.push("/");
  };

  return (
    <div className="min-h-screen w-full flex flex-col gap-8 items-center justify-center p-6">
      {/* Loading Overlay */}
      {renderOverlay && (
        <div
          className={`fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm transition-opacity duration-300 ${
            loadingPhase
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="px-6 text-center">
            <h1 className="text-4xl sm:text-4xl font-bold tracking-tight">
              {overlayTitle}
              <span className="inline-block w-10 text-left">
                {".".repeat(dotCount).padEnd(3, " ")}
              </span>
            </h1>
            <p
              className={`mt-6 max-w-xl text-base sm:text-lg italic transition-opacity duration-300 ${
                quoteFade ? "opacity-0" : "opacity-100"
              }`}
            >
              "{QUOTES[quoteIndex]}"
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {!selectedTopic ? (
        // Topic Selection Screen
        <div className="w-full max-w-3xl">
          <h1 className="text-3xl font-bold text-center mb-8">
            Choose a focus area
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => handleTopicSelection(topic)}
                className="p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all duration-200 text-center font-semibold text-lg"
              >
                {topic}
              </button>
            ))}
            <button
              onClick={handleCustomMode}
              className="p-6 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all duration-200 text-center font-semibold text-lg"
            >
              Custom
            </button>
          </div>
        </div>
      ) : suggestions.length > 0 ? (
        // Suggestions Screen
        <div className="mb-4 w-full max-w-xl">
          <h2 className="mb-2 text-lg font-semibold">
            Suggestions for {selectedTopic}
          </h2>
          <ul className="space-y-4">
            {suggestions.map((s) => (
              <li key={s.id} className="rounded-lg border p-3">
                <h3 className="text-xl">{s.title}</h3>
                <p className="text-sm opacity-80">{s.rationale}</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {s.steps.map((step, j) => (
                    <li key={j}>{step}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : isCustomMode ? (
        // Custom Journal Entry Screen
        <div className="w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Free Journal</h2>
          <textarea
            className="w-full min-h-[400px] p-4 rounded-lg border-2 border-border focus:border-primary focus:outline-none resize-y"
            placeholder="Write your thoughts here..."
            value={customJournal}
            onChange={(e) => setCustomJournal(e.target.value)}
          />
        </div>
      ) : (
        // Questions Screen
        <div className="w-full max-w-xl">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {selectedTopic}
          </h2>
          {questions.map((q, i) => (
            <div key={q.id} className="mb-4">
              <h2 className="mb-2">{q.text}</h2>
              <Input
                type="text"
                placeholder="Your answer"
                value={answers[i] ?? ""}
                onChange={(e) => onChangeAnswer(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {selectedTopic && (
        <>
          {suggestions.length > 0 ? (
            <Button onClick={handleSave}>Save</Button>
          ) : (
            <Button
              onClick={generateSuggestions}
              disabled={isCustomMode && !customJournal.trim()}
            >
              Submit
            </Button>
          )}
        </>
      )}
    </div>
  );
}
