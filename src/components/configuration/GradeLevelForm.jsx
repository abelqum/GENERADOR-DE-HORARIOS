"use client";

import { useActionState, useEffect, useRef } from "react";
import { GraduationCap } from "lucide-react";
import { createGradeLevelAction } from "@/app/(dashboard)/configuracion/grados/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function GradeLevelForm() {
  const formRef = useRef(null);

  const [state, formAction, isPending] = useActionState(
    createGradeLevelAction,
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
          Nuevo grado
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Registra los niveles escolares utilizados por la escuela.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <FormField
          label="Nombre del grado"
          htmlFor="name"
          description="Por ejemplo: Primero, Segundo o Tercero."
        >
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            placeholder="Primero"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </FormField>

        <FormField
          label="Número de orden"
          htmlFor="orderNumber"
          description="Define cómo aparecerán ordenados los grados."
        >
          <input
            id="orderNumber"
            name="orderNumber"
            type="number"
            required
            min={1}
            step={1}
            placeholder="1"
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
        disabled={isPending}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GraduationCap size={18} />

        {isPending ? "Registrando grado..." : "Registrar grado"}
      </button>
    </form>
  );
}