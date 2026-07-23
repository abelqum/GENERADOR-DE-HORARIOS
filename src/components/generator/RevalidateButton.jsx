"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

export default function RevalidateButton() {
  const router = useRouter();

  const [isPending, startTransition] =
    useTransition();

  function handleRevalidate() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleRevalidate}
      disabled={isPending}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw
        size={18}
        className={isPending ? "animate-spin" : ""}
      />

      {isPending
        ? "Validando..."
        : "Validar nuevamente"}
    </button>
  );
}