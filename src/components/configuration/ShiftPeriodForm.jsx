"use client";

import { useActionState, useEffect, useRef } from "react";
import { TimerReset } from "lucide-react";
import { createShiftPeriodAction } from "@/app/(dashboard)/configuracion/periodos/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function ShiftPeriodForm({ shifts }) {
  const formRef = useRef(null);

  const [state, formAction, isPending] = useActionState(
    createShiftPeriodAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h3 className="text-lg font-bold text-slate-900">
           Nueva hora
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Define una clase, receso o espacio no disponible.
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
  label="Nombre de la hora"
  htmlFor="name"
>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Hora 1"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </FormField>

        <FormField
          label="Tipo"
          htmlFor="periodType"
        >
          <select
            id="periodType"
            name="periodType"
            required
            defaultValue="class"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="class">Clase</option>
            <option value="recess">Receso</option>
            <option value="unavailable">
              No disponible
            </option>
          </select>
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Hora de inicio"
            htmlFor="startTime"
          >
            <input
              id="startTime"
              name="startTime"
              type="time"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>

          <FormField
            label="Hora de finalización"
            htmlFor="endTime"
          >
            <input
              id="endTime"
              name="endTime"
              type="time"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>
        </div>
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
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <TimerReset size={18} />

       {isPending ? "Registrando hora..." : "Registrar hora"}
      </button>
    </form>
  );
}