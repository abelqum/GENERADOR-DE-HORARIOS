"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";

import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";
import { generateSchedulePdf } from "@/lib/pdf/generateSchedulePdf";

export default function ExportSchedulePdfButton({
  schoolName,
  academicPeriodName,
  versionName,
  view,
  selectedEntity,
  shifts = [],
  groups = [],
  entries = [],
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const isGeneralView = view === "general";

  const isDisabled = isGenerating || (!isGeneralView && !selectedEntity);

  async function handleExport() {
    if (isGenerating) {
      return;
    }

    if (!Array.isArray(shifts) || shifts.length === 0) {
      await showErrorAlert({
        title: "No hay horario para exportar",
        text: "No existen turnos u horas configuradas para generar el PDF.",
      });

      return;
    }

    if (!isGeneralView && !selectedEntity) {
      await showErrorAlert({
        title: "Selecciona un horario",
        text: "Selecciona un grupo o profesor antes de exportar.",
      });

      return;
    }

    if (isGeneralView && (!Array.isArray(groups) || groups.length === 0)) {
      await showErrorAlert({
        title: "No hay grupos para exportar",
        text: "La vista general necesita al menos un grupo registrado.",
      });

      return;
    }

    const confirmed = await showConfirmAlert({
      icon: "question",

      title: isGeneralView
        ? "¿Descargar el horario general?"
        : "¿Descargar este horario?",

      text: isGeneralView
        ? "Se generará un PDF con todos los grupos, materias y profesores."
        : "Se generará el horario seleccionado en formato PDF.",

      confirmButtonText: "Sí, descargar",

      cancelButtonText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    setIsGenerating(true);

    try {
      generateSchedulePdf({
        schoolName,
        academicPeriodName,
        versionName,
        view,
        selectedEntity,
        shifts,
        groups,
        entries,
      });

      await showSuccessAlert({
        title: "PDF generado",

        text: isGeneralView
          ? "El horario general se descargó correctamente."
          : "El horario se descargó correctamente.",
      });
    } catch (error) {
      console.error("Error generando PDF:", error);

      await showErrorAlert({
        title: "No fue posible generar el PDF",

        text:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isDisabled}
      className="
        inline-flex items-center justify-center gap-2
        rounded-xl
        border border-red-600
        bg-white
        px-4 py-3
        text-sm font-semibold text-red-600
        shadow-sm
        transition-all duration-200

        hover:border-red-700
        hover:bg-red-600
        hover:text-white
        hover:shadow-md

        focus:outline-none
        focus:ring-2
        focus:ring-red-300
        focus:ring-offset-2

        disabled:cursor-not-allowed
        disabled:border-slate-300
        disabled:bg-slate-100
        disabled:text-slate-400
        disabled:opacity-60
        disabled:hover:border-slate-300
        disabled:hover:bg-slate-100
        disabled:hover:text-slate-400
      "
    >
      {isGenerating ? (
        <LoaderCircle size={17} className="animate-spin" />
      ) : (
        <Download size={17} />
      )}

      {isGenerating
        ? "Generando PDF..."
        : isGeneralView
          ? "Exportar vista general"
          : "Exportar PDF"}
    </button>
  );
}
