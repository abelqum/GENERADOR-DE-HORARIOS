"use client";

import { useActionState } from "react";
import { BookOpenCheck } from "lucide-react";
import { saveTeacherSubjectAction } from "@/app/(dashboard)/profesores/[teacherId]/configuracion/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function TeacherSubjectForm({
  teacherId,
  subjects,
}) {
  const [state, formAction, isPending] = useActionState(
    saveTeacherSubjectAction,
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
          Asignar materia
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Define qué materias puede impartir el profesor.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <FormField
          label="Materia"
          htmlFor="subjectId"
        >
          <select
            id="subjectId"
            name="subjectId"
            required
            defaultValue=""
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="" disabled>
              Selecciona una materia
            </option>

            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Prioridad"
          htmlFor="priority"
          description="1 representa la materia de mayor prioridad."
        >
          <input
            id="priority"
            name="priority"
            type="number"
            required
            min={1}
            max={100}
            step={1}
            defaultValue={1}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </FormField>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            name="isPrimary"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
          />

          <span>
            <span className="block text-sm font-medium text-slate-800">
              Materia principal
            </span>

            <span className="block text-xs text-slate-500">
              Indica que esta es una de sus especialidades
              principales.
            </span>
          </span>
        </label>
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
        disabled={isPending || subjects.length === 0}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        <BookOpenCheck size={18} />

        {isPending ? "Guardando..." : "Guardar materia"}
      </button>
    </form>
  );
}