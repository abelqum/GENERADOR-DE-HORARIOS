"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
  useTransition,
} from "react";
import {
  Lock,
  LockOpen,
} from "lucide-react";
import {
  toggleScheduleEntryLockAction,
} from "@/app/(dashboard)/horarios/[versionId]/actions";
import {
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";

export default function ScheduleEntryLockButton({
  versionId,
  entry,
  disabled = false,
}) {
  const router = useRouter();

  const [isPending, setIsPending] =
    useState(false);

  const [, startTransition] =
    useTransition();

  async function handleClick() {
    if (disabled || isPending) {
      return;
    }

    setIsPending(true);

    const formData = new FormData();

    formData.set("versionId", versionId);
    formData.set("entryId", entry.id);
    formData.set(
      "nextLocked",
      String(!entry.locked),
    );

    const result =
      await toggleScheduleEntryLockAction(
        formData,
      );

    setIsPending(false);

    if (!result.success) {
      await showErrorAlert({
        title: "No fue posible actualizar",
        text: result.message,
      });

      return;
    }

    await showSuccessAlert({
      title: entry.locked
        ? "Clase desbloqueada"
        : "Clase bloqueada",
      text: result.message,
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      title={
        entry.locked
          ? "Desbloquear clase"
          : "Bloquear clase"
      }
      className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {entry.locked ? (
        <LockOpen size={16} />
      ) : (
        <Lock size={16} />
      )}
    </button>
  );
}