"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { getSchoolDirectorNameAction } from "@/app/(dashboard)/horarios/[versionId]/pdf-actions";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";
import { generateSchedulePdf } from "@/lib/pdf/generateSchedulePdf";

function createWorkshopEntries({ fixedEntries, groups }) {
  const groupsById = new Map(groups.map((group) => [group.id, group]));

  return fixedEntries.map((fixedEntry) => {
    const group =
      groupsById.get(fixedEntry.group_id) ?? fixedEntry.group ?? null;

    return {
      /*
       * No se guarda en Supabase.
       * Solamente existe durante la
       * generación del PDF.
       */
      id: `workshop-${fixedEntry.id}`,

      group_id: fixedEntry.group_id,

      subject_id: null,

      teacher_id: null,

      day_of_week: fixedEntry.day_of_week,

      shift_period_id: fixedEntry.shift_period_id,

      occurrence_number: fixedEntry.slot_order ?? 1,

      locked: true,

      is_fixed_activity: true,

      activity_type: "workshop",

      label: "Taller",

      subject: {
        id: `workshop-subject-${fixedEntry.id}`,

        name: "Taller",

        code: "TALLER",

        color: fixedEntry.color || "#f59e0b",
      },

      teacher: {
        id: `workshop-teacher-${fixedEntry.id}`,

        first_name: "",

        last_name: "",

        employee_number: null,
      },

      group,
    };
  });
}

function createTeacherServiceEntries({ teacherSlotLabels, selectedEntity }) {
  if (!selectedEntity?.id) {
    return [];
  }

  return teacherSlotLabels
    .filter((slotLabel) => {
      const dayOfWeek = Number(slotLabel?.day_of_week);

      return (
        slotLabel?.label === "service" &&
        slotLabel?.shift_period_id &&
        Number.isInteger(dayOfWeek)
      );
    })
    .map((slotLabel) => {
      const dayOfWeek = Number(slotLabel.day_of_week);

      return {
        /*
         * Entrada temporal.
         *
         * No se guarda como clase.
         */
        id: `service-${slotLabel.id}`,

        group_id: null,

        subject_id: null,

        teacher_id: selectedEntity.id,

        day_of_week: dayOfWeek,

        shift_period_id: slotLabel.shift_period_id,

        occurrence_number: 1,

        locked: true,

        is_teacher_slot_label: true,

        activity_type: "service",

        label: "Servicio",

        subject: {
          id: `service-subject-${slotLabel.id}`,

          name: "Servicio",

          code: "SERVICIO",

          color: "#2563eb",
        },

        teacher: {
          id: selectedEntity.id,

          first_name: "",

          last_name: "",

          employee_number: null,
        },

        group: null,
      };
    });
}

export default function ExportSchedulePdfButton({
  schoolName,
  academicPeriodName,
  versionName,
  view,
  selectedEntity,
  shifts = [],
  groups = [],
  entries = [],
  fixedEntries = [],
  teacherSlotLabels = [],
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const isGeneralView = view === "general";

  const isDisabled = isGenerating || (!isGeneralView && !selectedEntity);

  const pdfEntries = useMemo(() => {
    if (view === "teacher") {
      const serviceEntries = createTeacherServiceEntries({
        teacherSlotLabels,
        selectedEntity,
      });

      /*
       * Las clases se colocan después.
       *
       * Si por algún error existiera Servicio
       * sobre una clase, la clase tendrá prioridad.
       */
      return [...serviceEntries, ...entries];
    }

    const workshopEntries = createWorkshopEntries({
      fixedEntries,
      groups,
    });

    return [...entries, ...workshopEntries];
  }, [entries, fixedEntries, groups, selectedEntity, teacherSlotLabels, view]);

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
        ? "Se generará un PDF con todos los grupos, materias, profesores y talleres."
        : view === "group"
          ? "Se generará el horario del grupo incluyendo sus talleres fijos."
          : "Se generará el horario del profesor en formato PDF.",

      confirmButtonText: "Sí, descargar",

      cancelButtonText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    setIsGenerating(true);

    try {
      let directorName = "";

      /*
       * El nombre de la directora solamente
       * es necesario para el PDF del profesor.
       */
      if (view === "teacher") {
        const directorResult = await getSchoolDirectorNameAction();

        if (!directorResult?.success) {
          await showErrorAlert({
            title: "No se encontró la directora",

            text:
              directorResult?.message ||
              "No fue posible obtener el nombre de la directora.",
          });

          return;
        }

        directorName = directorResult.directorName;
      }

      generateSchedulePdf({
        schoolName,

        academicPeriodName,

        versionName,

        view,

        selectedEntity,

        shifts,

        groups,

        entries: pdfEntries,

        directorName,
      });

      await showSuccessAlert({
        title: "PDF generado",

        text: isGeneralView
          ? "El horario general se descargó correctamente."
          : view === "group"
            ? "El horario del grupo se descargó con sus talleres."
            : "El horario del profesor se descargó correctamente.",
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
