"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  RefreshCw,
} from "lucide-react";
import {
  reoptimizeScheduleAction,
} from "@/app/(dashboard)/horarios/[versionId]/actions";
import {
  closeAlert,
  showConfirmAlert,
  showErrorAlert,
  showLoadingAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";

const initialState = {
  success: false,
  message: "",
  newVersionId: null,
  solverStatus: null,
};

export default function ReoptimizeScheduleButton({
  versionId,
  versionStatus,
  lockedEntriesCount,
}) {
  const router = useRouter();
  const formRef = useRef(null);

  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    reoptimizeScheduleAction,
    initialState,
  );

  useEffect(() => {
    if (!isPending) {
      closeAlert();
      return;
    }

    showLoadingAlert({
      title:
        "Reoptimizando horario",
      text:
        lockedEntriesCount > 0
          ? `OR-Tools conservará ${lockedEntriesCount} clases bloqueadas.`
          : "OR-Tools reorganizará el horario completo.",
    });
  }, [
    isPending,
    lockedEntriesCount,
  ]);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    async function displayResult() {
      if (
        state.success &&
        state.newVersionId
      ) {
        await showSuccessAlert({
          title:
            "Reoptimización completada",
          text: state.message,
        });

        router.push(
          `/horarios/${state.newVersionId}`,
        );

        return;
      }

      await showErrorAlert({
        title:
          "No fue posible reoptimizar",
        text: state.message,
      });

      setConfirmed(false);
    }

    void displayResult();
  }, [
    state,
    router,
  ]);

  async function handleSubmit(event) {
    if (confirmed) {
      return;
    }

    event.preventDefault();

    const accepted =
      await showConfirmAlert({
        title:
          "¿Reoptimizar este horario?",
        text:
          lockedEntriesCount > 0
            ? `Se creará una versión nueva y se conservarán ${lockedEntriesCount} clases bloqueadas.`
            : "Se creará una versión nueva. Como no hay clases bloqueadas, todo podrá reorganizarse.",
        confirmButtonText:
          "Sí, reoptimizar",
        cancelButtonText:
          "Cancelar",
      });

    if (!accepted) {
      return;
    }

    setConfirmed(true);

    window.setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 0);
  }

  if (versionStatus !== "draft") {
  return null;
}

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
    >
      <input
        type="hidden"
        name="versionId"
        value={versionId}
      />

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw
          size={17}
          className={
            isPending
              ? "animate-spin"
              : ""
          }
        />

        {isPending
          ? "Reoptimizando..."
          : "Reoptimizar horario"}
      </button>
    </form>
  );
}