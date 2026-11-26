"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optional error logging hook
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#04060A] px-4 text-center">
      <div className="apple-glass max-w-md space-y-5 p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E5394D]/15 text-[#FF7A8A]">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-[#F4F1EA]">
          Something went wrong
        </h1>
        <p className="text-sm text-[#9AA3B2]">
          A temporary error interrupted this page. Check your connection and try again.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Back Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
