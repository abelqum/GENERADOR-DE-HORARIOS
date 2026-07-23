"use client";

import { useActionState } from "react";
import { Clock3 } from "lucide-react";
import { saveTeacherShiftAction } from "@/app/(dashboard)/profesores/[teacherId]/configuracion/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function TeacherShiftForm({
  teacherId,
  shifts,
  teacherMaxWeeklyPeriods,
}) {
  const [state, formAction, isPending] = useActionState(
    saveTeacherShiftAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <input
        type="hidden"
        name="teacherId"
        value={teacherId}
      />

      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Asignar turno
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Define los turnos en los que puede trabajar.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <FormField
          label="Turno"
          htmlFor="shiftId"
        >
          <select
            id="shiftId"
            name="shiftId"
            required
            defaultValue=""
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="" disabled>
              Selecciona un turno
            </option>

            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Máximo semanal en este turno"
          htmlFor="maxWeeklyPeriods"
          description={`El profesor tiene un máximo total de ${teacherMaxWeeklyPeriods} horas.`}
        >
          <input
            id="maxWeeklyPeriods"
            name="maxWeeklyPeriods"
            type="number"
            required
            min={1}
            max={teacherMaxWeeklyPeriods}
            step={1}
            defaultValue={teacherMaxWeeklyPeriods}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </FormField>
      </div>

      {state.message && (
        <div className="mt-5">
          <Alert type={state.success ? "success" : "error"}>
            {state.message}
          </Alert>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || shifts.length === 0}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        <Clock3 size={18} />

        {isPending ? "Guardando..." : "Guardar turno"}
      </button>
    </form>
  );
}