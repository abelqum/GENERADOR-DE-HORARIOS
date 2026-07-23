"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import { createTeacherAction } from "@/app/(dashboard)/profesores/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function TeacherForm() {
  const formRef = useRef(null);

  const [state, formAction, isPending] = useActionState(
    createTeacherAction,
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
          Nuevo profesor
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Registra sus datos y límites de carga académica.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <FormField
          label="Número de empleado"
          htmlFor="employeeNumber"
          description="Dato opcional, pero debe ser único."
        >
          <input
            id="employeeNumber"
            name="employeeNumber"
            type="text"
            maxLength={50}
            placeholder="DOC-001"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Nombre"
            htmlFor="firstName"
          >
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              maxLength={100}
              placeholder="Juan"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>

          <FormField
            label="Apellidos"
            htmlFor="lastName"
          >
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              maxLength={150}
              placeholder="Pérez López"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Correo electrónico"
            htmlFor="email"
          >
            <input
              id="email"
              name="email"
              type="email"
              placeholder="profesor@escuela.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>

          <FormField
            label="Teléfono"
            htmlFor="phone"
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="55 0000 0000"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Máximo semanal"
            htmlFor="maxWeeklyPeriods"
            description="Cantidad máxima de horas por semana."
          >
            <input
              id="maxWeeklyPeriods"
              name="maxWeeklyPeriods"
              type="number"
              required
              min={1}
              max={100}
              step={1}
              defaultValue={40}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>

          <FormField
            label="Máximo diario"
            htmlFor="maxDailyPeriods"
            description="Cantidad máxima de horas por día."
          >
            <input
              id="maxDailyPeriods"
              name="maxDailyPeriods"
              type="number"
              required
              min={1}
              max={20}
              step={1}
              defaultValue={8}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>
        </div>

        <FormField
          label="Notas"
          htmlFor="notes"
          description="Información adicional o condiciones especiales."
        >
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Observaciones del profesor"
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
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
        disabled={isPending}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UserPlus size={18} />

        {isPending
          ? "Registrando profesor..."
          : "Registrar profesor"}
      </button>
    </form>
  );
}