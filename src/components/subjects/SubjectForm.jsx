"use client";

import { useActionState, useEffect, useRef } from "react";
import { BookPlus } from "lucide-react";
import { createSubjectAction } from "@/app/(dashboard)/materias/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function SubjectForm() {
  const formRef = useRef(null);

  const [state, formAction, isPending] = useActionState(
    createSubjectAction,
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
          Nueva materia
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Registra una asignatura del plan escolar.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <FormField
          label="Nombre de la materia"
          htmlFor="name"
        >
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={150}
            placeholder="Matemáticas"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </FormField>

        <FormField
          label="Código"
          htmlFor="code"
          description="Dato opcional. Por ejemplo: MAT, ESP o CIEN."
        >
          <input
            id="code"
            name="code"
            type="text"
            maxLength={30}
            placeholder="MAT"
            className="w-full uppercase rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </FormField>

        <FormField
          label="Color de identificación"
          htmlFor="color"
        >
          <div className="flex items-center gap-3">
            <input
              id="color"
              name="color"
              type="color"
              defaultValue="#2563EB"
              className="h-12 w-16 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
            />

            <p className="text-sm text-slate-500">
              Este color aparecerá en los horarios.
            </p>
          </div>
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
        <BookPlus size={18} />

        {isPending
          ? "Registrando materia..."
          : "Registrar materia"}
      </button>
    </form>
  );
}