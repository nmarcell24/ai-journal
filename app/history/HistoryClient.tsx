"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DBRow = {
  id: string;
  created_at: string;
  questions: string[];
  answers: string[];
  suggestions: any; // jsonb OR stringified json OR possibly "ARRAY[]::text[]"
};

type Suggestion = {
  id?: string;
  title: string;
  rationale?: string;
  steps?: string[];
};

function normalizeSuggestions(raw: any): Suggestion[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Suggestion[];
  if (typeof raw === "string") {
    if (raw.trim() === "" || raw.trim() === "ARRAY[]::text[]") return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Suggestion[]) : [];
    } catch {
      return [];
    }
  }
  // json object or other → try best-effort
  return [];
}

function formatDT(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function HistoryClient({
  initialEntries,
}: {
  initialEntries: DBRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<DBRow[]>(initialEntries);
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const hay = [
        ...(e.questions ?? []),
        ...(e.answers ?? []),
        ...normalizeSuggestions(e.suggestions).flatMap((s) => [
          s.title,
          s.rationale ?? "",
          ...(s.steps ?? []),
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    setBusy(id);
    const { error } = await supabase.from("journals").delete().eq("id", id);
    setBusy(null);
    if (error) {
      alert(error.message);
      return;
    }
    setEntries((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <section className="mx-auto w-full max-w-3xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">History</h1>
        <div className="ml-auto w-full max-w-sm">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, answers, suggestions…"
          />
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className="opacity-70">No entries found.</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((row) => {
            const suggs = normalizeSuggestions(row.suggestions);
            const preview = (
              row.answers?.filter(Boolean)[0] ??
              row.questions?.filter(Boolean)[0] ??
              ""
            ).slice(0, 120);

            return (
              <li key={row.id} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm opacity-70">
                      {formatDT(row.created_at)}
                    </div>
                    <div className="mt-1 font-medium">
                      {preview ? preview : "Journal entry"}
                      {preview.length === 120 ? "…" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        const det = (e.currentTarget.parentElement
                          ?.parentElement?.nextSibling ??
                          null) as HTMLDetailsElement | null;
                        det?.setAttribute(
                          "open",
                          det?.getAttribute("open") ? "" : "true"
                        );
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(row.id)}
                      disabled={busy === row.id}
                    >
                      {busy === row.id ? "Deleting…" : "Delete"}
                    </Button>
                  </div>
                </div>

                {/* details/summary for full content (zero-dependency UI) */}
                <details className="mt-4 rounded-xl bg-muted/30 p-4">
                  <summary className="cursor-pointer select-none text-sm font-medium">
                    Details
                  </summary>

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Questions</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {row.questions?.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Answers</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {row.answers?.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="mb-2 text-sm font-semibold">Suggestions</h3>
                    {suggs.length === 0 ? (
                      <p className="text-sm opacity-70">— none —</p>
                    ) : (
                      <ul className="space-y-3">
                        {suggs.map((s, i) => (
                          <li key={s.id ?? i} className="rounded-lg border p-3">
                            <div className="font-medium">{s.title}</div>
                            {s.rationale && (
                              <p className="text-sm opacity-80 mt-1">
                                {s.rationale}
                              </p>
                            )}
                            {s.steps && s.steps.length > 0 && (
                              <ol className="mt-2 list-decimal pl-5 space-y-1">
                                {s.steps.map((st, j) => (
                                  <li key={j}>{st}</li>
                                ))}
                              </ol>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
