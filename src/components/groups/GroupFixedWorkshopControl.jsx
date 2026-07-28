"use client";

import {
  CalendarClock,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Swal from "sweetalert2";

import {
  deleteGroupFixedWorkshopAction,
  saveGroupFixedWorkshopAction,
} from "@/app/(dashboard)/grupos/talleres/actions";
import { showErrorAlert, showSuccessAlert } from "@/lib/alerts/swal";

const SCHOOL_DAYS = [
  {
    value: 1,
    label: "Lunes",
  },
  {
    value: 2,
    label: "Martes",
  },
  {
    value: 3,
    label: "Miércoles",
  },
  {
    value: 4,
    label: "Jueves",
  },
  {
    value: 5,
    label: "Viernes",
  },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(value) {
  if (!value) {
    return "--:--";
  }

  return String(value).slice(0, 5);
}

function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getPossibleBlocks(periods) {
  const orderedPeriods = [...periods]
    .filter((period) => period.active)
    .sort(
      (firstPeriod, secondPeriod) =>
        firstPeriod.period_number - secondPeriod.period_number,
    );

  const blocks = [];

  for (let index = 0; index <= orderedPeriods.length - 3; index += 1) {
    const block = orderedPeriods.slice(index, index + 3);

    const allAreClasses = block.every(
      (period) => period.period_type === "class",
    );

    if (!allAreClasses) {
      continue;
    }

    const periodNumbersAreConsecutive =
      block[1].period_number === block[0].period_number + 1 &&
      block[2].period_number === block[1].period_number + 1;

    if (!periodNumbersAreConsecutive) {
      continue;
    }

    blocks.push({
      key: block.map((period) => period.id).join("|"),

      periodIds: block.map((period) => period.id),

      startTime: block[0].start_time,

      endTime: block[block.length - 1].end_time,

      periods: block,
    });
  }

  return blocks;
}

function getResolvedFixedPeriods({ fixedPeriods, shiftPeriods }) {
  return [...fixedPeriods]
    .sort(
      (firstPeriod, secondPeriod) =>
        firstPeriod.slot_order - secondPeriod.slot_order,
    )
    .map((fixedPeriod) => {
      const relatedPeriod = normalizeRelation(fixedPeriod.period);

      const fallbackPeriod = shiftPeriods.find(
        (period) => period.id === fixedPeriod.shift_period_id,
      );

      return {
        ...fixedPeriod,
        period: relatedPeriod ?? fallbackPeriod ?? null,
      };
    });
}

export default function GroupFixedWorkshopControl({
  group,
  shiftPeriods = [],
}) {
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);

  const [, startTransition] = useTransition();

  const groupShiftPeriods = shiftPeriods.filter(
    (period) => period.shift_id === group.shift_id,
  );

  const possibleBlocks = getPossibleBlocks(groupShiftPeriods);

  const fixedPeriods = getResolvedFixedPeriods({
    fixedPeriods: group.fixed_workshop_periods ?? [],
    shiftPeriods: groupShiftPeriods,
  });

  const hasWorkshop = fixedPeriods.length === 3;

  const currentDayOfWeek = fixedPeriods[0]?.day_of_week ?? 1;

  const currentBlockKey = fixedPeriods
    .map((fixedPeriod) => fixedPeriod.shift_period_id)
    .join("|");

  const currentDay = SCHOOL_DAYS.find((day) => day.value === currentDayOfWeek);

  const firstFixedPeriod = fixedPeriods[0]?.period;

  const lastFixedPeriod = fixedPeriods[fixedPeriods.length - 1]?.period;

  async function handleConfigure() {
    if (isProcessing) {
      return;
    }

    if (!possibleBlocks.length) {
      await showErrorAlert({
        title: "No hay bloques disponibles",
        text: "El turno del grupo no tiene tres horas de clase consecutivas disponibles.",
      });

      return;
    }

    const dayOptions = SCHOOL_DAYS.map(
      (day) => `
          <option
            value="${day.value}"
            ${day.value === currentDayOfWeek ? "selected" : ""}
          >
            ${day.label}
          </option>
        `,
    ).join("");

    const blockOptions = possibleBlocks
      .map((block) => {
        const periodNames = block.periods
          .map((period) => period.name || `Hora ${period.period_number}`)
          .join(" · ");

        return `
            <option
              value="${block.key}"
              ${block.key === currentBlockKey ? "selected" : ""}
            >
              ${formatTime(block.startTime)}–${formatTime(
                block.endTime,
              )} · ${escapeHtml(periodNames)}
            </option>
          `;
      })
      .join("");

    const result = await Swal.fire({
      title: hasWorkshop ? "Editar taller fijo" : "Configurar taller fijo",

      width: 620,

      html: `
        <div class="text-left">
          <div class="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Grupo
            </p>

            <p class="mt-1 font-bold text-amber-950">
              ${escapeHtml(group.name)}
              ·
              ${escapeHtml(group.shift?.name || "Sin turno")}
            </p>

            <p class="mt-2 text-xs leading-5 text-amber-700">
              El bloque ocupará tres horas consecutivas y posteriormente será respetado por el generador.
            </p>
          </div>

          <label
            for="swal-workshop-day"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Día del taller
          </label>

          <select
            id="swal-workshop-day"
            class="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          >
            ${dayOptions}
          </select>

          <label
            for="swal-workshop-block"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Bloque de tres horas
          </label>

          <select
            id="swal-workshop-block"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          >
            ${blockOptions}
          </select>

          <div
            id="swal-workshop-preview"
            class="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-600"
          >
            Se reservarán las tres horas seleccionadas para Taller.
          </div>
        </div>
      `,

      showCancelButton: true,
      confirmButtonText: hasWorkshop ? "Guardar cambios" : "Guardar taller",

      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusConfirm: false,

      confirmButtonColor: "#d97706",
      cancelButtonColor: "#64748b",

      preConfirm: () => {
        const dayOfWeek = Number.parseInt(
          String(document.getElementById("swal-workshop-day")?.value ?? ""),
          10,
        );

        const selectedBlockKey = String(
          document.getElementById("swal-workshop-block")?.value ?? "",
        ).trim();

        const selectedBlock = possibleBlocks.find(
          (block) => block.key === selectedBlockKey,
        );

        if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 5) {
          Swal.showValidationMessage("Selecciona un día válido.");

          return false;
        }

        if (!selectedBlock) {
          Swal.showValidationMessage("Selecciona un bloque de tres horas.");

          return false;
        }

        return {
          dayOfWeek,
          periodIds: selectedBlock.periodIds,
        };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    setIsProcessing(true);

    Swal.fire({
      title: "Guardando taller",
      text: "Espera mientras se guarda el bloque fijo.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,

      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const formData = new FormData();

      formData.set("groupId", group.id);

      formData.set("dayOfWeek", String(result.value.dayOfWeek));

      formData.set("periodIds", JSON.stringify(result.value.periodIds));

      const saveResult = await saveGroupFixedWorkshopAction(formData);

      Swal.close();

      if (!saveResult?.success) {
        await showErrorAlert({
          title: "No fue posible guardar",
          text: saveResult?.message || "No fue posible guardar el taller fijo.",
        });

        return;
      }

      await showSuccessAlert({
        title: hasWorkshop ? "Taller actualizado" : "Taller configurado",
        text: saveResult.message,
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Error guardando taller fijo:", error);

      Swal.close();

      await showErrorAlert({
        title: "No fue posible guardar",
        text: "Ocurrió un error inesperado al guardar el taller.",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDelete() {
    if (isProcessing || !hasWorkshop) {
      return;
    }

    const confirmation = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar taller fijo?",

      html: `
          <p>
            Se eliminará el bloque de taller del grupo
            <strong>
              ${escapeHtml(group.name)}
            </strong>.
          </p>

          <p style="margin-top:12px; color:#b45309; font-size:13px;">
            Podrás configurar otro bloque antes de generar el horario.
          </p>
        `,

      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusCancel: true,

      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setIsProcessing(true);

    Swal.fire({
      title: "Eliminando taller",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,

      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const formData = new FormData();

      formData.set("groupId", group.id);

      const deleteResult = await deleteGroupFixedWorkshopAction(formData);

      Swal.close();

      if (!deleteResult?.success) {
        await showErrorAlert({
          title: "No fue posible eliminar",
          text:
            deleteResult?.message || "No fue posible eliminar el taller fijo.",
        });

        return;
      }

      await showSuccessAlert({
        title: "Taller eliminado",
        text: deleteResult.message,
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Error eliminando taller fijo:", error);

      Swal.close();

      await showErrorAlert({
        title: "No fue posible eliminar",
        text: "Ocurrió un error inesperado al eliminar el taller.",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-w-[220px]">
      {hasWorkshop ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <CalendarClock
              size={17}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-900">
                Taller configurado
              </p>

              <p className="mt-1 text-xs text-amber-700">
                {currentDay?.label || "Día no disponible"}
              </p>

              <p className="mt-0.5 text-xs font-semibold text-amber-800">
                {formatTime(firstFixedPeriod?.start_time)}
                {" – "}
                {formatTime(lastFixedPeriod?.end_time)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConfigure}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-50"
            >
              {isProcessing ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Pencil size={14} />
              )}
              Editar
            </button>

            <button
              type="button"
              title="Eliminar taller fijo"
              disabled={isProcessing}
              onClick={handleDelete}
              className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleConfigure}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-50"
        >
          {isProcessing ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Plus size={15} />
          )}
          Configurar taller
        </button>
      )}
    </div>
  );
}
