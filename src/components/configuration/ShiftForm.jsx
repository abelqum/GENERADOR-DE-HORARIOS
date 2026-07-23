"use client";

import { useActionState, useEffect, useRef } from "react";
import { Clock3 } from "lucide-react";
import { createShiftAction } from "@/app/(dashboard)/configuracion/turnos/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function ShiftForm() {
  const formRef = useRef(null);

  const [state, formAction, isPending] = useActionState(
    createShiftAction,
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
          Nuevo turno
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Define el horario general del turno escolar.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <FormField
          label="Nombre del turno"
          htmlFor="name"
        >
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            placeholder="Matutino"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
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
        disabled={isPending}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Clock3 size={18} />

        {isPending ? "Registrando turno..." : "Registrar turno"}
      </button>
    </form>
  );
}