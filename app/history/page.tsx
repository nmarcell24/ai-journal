// app/history/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryClient from "./HistoryClient";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Fetch the user’s entries (RLS will still enforce ownership)
  const { data, error } = await supabase
    .from("journals")
    .select("id, created_at, questions, answers, suggestions")
    .order("created_at", { ascending: false });

  if (error) {
    // surface nicely or route to an error boundary
    throw error;
  }

  return <HistoryClient initialEntries={data ?? []} />;
}
