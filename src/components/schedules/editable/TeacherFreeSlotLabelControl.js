"use client";

import { BriefcaseBusiness, Check, LoaderCircle, Sofa } from "lucide-react";
import { useState, useTransition } from "react";

import { saveTeacherSlotLabelAction } from "@/app/(dashboard)/horarios/[versionId]/teacher-slot-actions";
import { showErrorAlert } from "@/lib/alerts/swal";

export default function TeacherFreeSlotLabelControl({
  versionId,
  teacherId,
  dayOfWeek,
  shiftPeriodId,
  initialLabel = "free",
}) {
  const [selectedLabel, setSelectedLabel] = useState(
    initialLabel === "service" ? "service" : "free",
  );

  const [isPending, startTransition] = useTransition();

  function saveLabel(label) {
    if (isPending || label === selectedLabel) {
      return;
    }

    const previousLabel = selectedLabel;

    /*
     * Actualización optimista para que
     * el botón responda inmediatamente.
     */
    setSelectedLabel(label);

    startTransition(async () => {
      const formData = new FormData();

      formData.set("versionId", versionId);

      formData.set("teacherId", teacherId);

      formData.set("dayOfWeek", String(dayOfWeek));

      formData.set("shiftPeriodId", shiftPeriodId);

      formData.set("label", label);

      const result = await saveTeacherSlotLabelAction(formData);

      if (!result?.success) {
        setSelectedLabel(previousLabel);

        await showErrorAlert({
          title: "No se pudo guardar",

          text: result?.message || "Ocurrió un error al actualizar la hora.",
        });
      }
    });
  }

  const isFree = selectedLabel === "free";

  const isService = selectedLabel === "service";

  return (
    <div
      className={`flex min-h-28 flex-col justify-center rounded-xl border p-3 transition ${
        isService
          ? "border-blue-300 bg-blue-50"
          : "border-slate-200 bg-slate-50"
      }`}
      onPointerDown={(event) => {
        /*
         * Evita que los botones activen
         * accidentalmente el arrastre.
         */
        event.stopPropagation();
      }}
    >
      <div className="mb-3 flex items-center justify-center gap-2">
        {isPending ? (
          <LoaderCircle size={15} className="animate-spin text-slate-500" />
        ) : isService ? (
          <BriefcaseBusiness size={15} className="text-blue-700" />
        ) : (
          <Sofa size={15} className="text-slate-500" />
        )}

        <p
          className={`text-xs font-bold ${
            isService ? "text-blue-800" : "text-slate-600"
          }`}
        >
          {isService ? "Servicio" : "Hora libre"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => saveLabel("free")}
          className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${
            isFree
              ? "border-slate-600 bg-slate-700 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
          } disabled:cursor-wait disabled:opacity-60`}
        >
          {isFree && <Check size={12} />}
          Libre
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => saveLabel("service")}
          className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${
            isService
              ? "border-blue-700 bg-blue-700 text-white"
              : "border-blue-200 bg-white text-blue-700 hover:border-blue-500"
          } disabled:cursor-wait disabled:opacity-60`}
        >
          {isService && <Check size={12} />}
          Servicio
        </button>
      </div>
    </div>
  );
}
