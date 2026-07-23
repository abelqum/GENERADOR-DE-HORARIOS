"use client";

import {
  useActionState,
  useEffect,
} from "react";
import {
  Eraser,
  PaintBucket,
} from "lucide-react";
import {
  clearTeacherAvailabilityAction,
  fillFilteredTeacherAvailabilityAction,
} from "@/app/(dashboard)/disponibilidad/actions";
import {
  AVAILABILITY_OPTIONS,
} from "@/constants/availability";
import { SCHOOL_DAYS } from "@/constants/days";
import {
  showErrorAlert,
  showSuccessAlert,
  showConfirmAlert,
} from "@/lib/alerts/swal";

const initialState = {
  success: false,
  message: "",
};

export default function AvailabilityBulkActions({
  teacherId,
  teacherShifts,
}) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    fillFilteredTeacherAvailabilityAction,
    initialState,
  );

  useEffect(() => {
    if (!state.message) {
      return;
    }

    async function showResult() {
      if (state.success) {
        await showSuccessAlert({
          title:
            "Disponibilidad actualizada",
          text: state.message,
        });

        return;
      }

      await showErrorAlert({
        title:
          "No fue posible actualizar",
        text: state.message,
      });
    }

    void showResult();
  }, [state]);

  if (!teacherId) {
    return null;
  }

  const shifts = (
    teacherShifts ?? []
  )
    .map((teacherShift) =>
      Array.isArray(
        teacherShift.shift,
      )
        ? teacherShift.shift[0]
        : teacherShift.shift,
    )
    .filter(Boolean);

  async function handleClear(event) {
    event.preventDefault();

    const confirmed =
      await showConfirmAlert({
        title:
          "¿Limpiar disponibilidad?",
        text:
          "Se eliminarán todas las preferencias registradas para este profesor en el ciclo actual.",
        confirmButtonText:
          "Sí, limpiar",
        cancelButtonText:
          "Cancelar",
      });

    if (!confirmed) {
      return;
    }

    const formData =
      new FormData(
        event.currentTarget,
      );

    await clearTeacherAvailabilityAction(
      formData,
    );

    await showSuccessAlert({
      title:
        "Disponibilidad eliminada",
      text:
        "El profesor quedó disponible de forma predeterminada en todas sus horas.",
    });

    window.location.reload();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="font-bold text-slate-900">
          Aplicación masiva
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Configura varias horas sin modificar cada celda individualmente.
        </p>
      </div>

      <form
        action={formAction}
        className="mt-5 space-y-4"
      >
        <input
          type="hidden"
          name="teacherId"
          value={teacherId}
        />

        <div>
          <label
            htmlFor="bulkAvailabilityType"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Disponibilidad
          </label>

          <select
            id="bulkAvailabilityType"
            name="availabilityType"
            required
            defaultValue="available"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            {AVAILABILITY_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="bulkAvailabilityDay"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Día
          </label>

          <select
            id="bulkAvailabilityDay"
            name="dayOfWeek"
            defaultValue="all"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">
              Toda la semana
            </option>

            {SCHOOL_DAYS.map((day) => (
              <option
                key={day.value}
                value={day.value}
              >
                {day.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="bulkAvailabilityShift"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Turno
          </label>

          <select
            id="bulkAvailabilityShift"
            name="shiftId"
            defaultValue="all"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">
              Todos los turnos
            </option>

            {shifts.map((shift) => (
              <option
                key={shift.id}
                value={shift.id}
              >
                {shift.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
        >
          <PaintBucket size={18} />

          {isPending
            ? "Aplicando..."
            : "Aplicar disponibilidad"}
        </button>
      </form>

      <div className="my-5 border-t border-slate-200" />

      <form onSubmit={handleClear}>
        <input
          type="hidden"
          name="teacherId"
          value={teacherId}
        />

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          <Eraser size={17} />
          Limpiar disponibilidad
        </button>
      </form>
    </section>
  );
}