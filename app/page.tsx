import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-cover">
      <h1 className="text-5xl mb-4 font-bold max-w-2xl text-center">
        Journal AI -{" "}
        <span className="text-foreground font-semibold">
          Your AI-powered journal assistant
        </span>
      </h1>
      <div className="flex gap-5 items-center">
        <Button asChild variant="default">
          <Link href="/questions">Questions</Link>
        </Button>
        <Button variant="outline">
          <Link href="/history">History</Link>
        </Button>
      </div>
    </div>
  );
}
