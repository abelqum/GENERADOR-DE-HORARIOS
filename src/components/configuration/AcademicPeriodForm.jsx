"use client";

import { useActionState, useEffect, useRef } from "react";
import { CalendarPlus } from "lucide-react";
import {
  createAcademicPeriodAction,
} from "@/app/(dashboard)/configuracion/ciclos/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function AcademicPeriodForm() {
  const formRef = useRef(null);

  const [state, formAction, isPending] = useActionState(
    createAcademicPeriodAction,
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
          Nuevo ciclo escolar
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Registra las fechas del periodo académico.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <FormField
            label="Nombre del ciclo"
            htmlFor="name"
            description="Por ejemplo: Ciclo escolar 2026-2027."
          >
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={3}
              placeholder="Ciclo escolar 2026-2027"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>
        </div>

        <FormField
          label="Fecha de inicio"
          htmlFor="startDate"
        >
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </FormField>

        <FormField
          label="Fecha de finalización"
          htmlFor="endDate"
        >
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </FormField>
      </div>

      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input
          name="active"
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
        />

        <span>
          <span className="block text-sm font-medium text-slate-800">
            Establecer como ciclo activo
          </span>

          <span className="block text-xs text-slate-500">
            El ciclo activo será utilizado en grupos, asignaciones
            y horarios.
          </span>
        </span>
      </label>

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
        <CalendarPlus size={18} />

        {isPending
          ? "Registrando ciclo..."
          : "Registrar ciclo"}
      </button>
    </form>
  );
}