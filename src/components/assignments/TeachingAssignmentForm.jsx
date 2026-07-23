"use client";

import { useActionState, useEffect, useRef } from "react";
import { ClipboardPlus } from "lucide-react";
import { createTeachingAssignmentAction } from "@/app/(dashboard)/asignaciones/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function TeachingAssignmentForm({
  activeAcademicPeriod,
  groups,
  subjects,
  teachers,
}) {
  const formRef = useRef(null);

  const [state, formAction, isPending] = useActionState(
    createTeachingAssignmentAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  const canCreate =
    Boolean(activeAcademicPeriod) &&
    groups.length > 0 &&
    subjects.length > 0 &&
    teachers.length > 0;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Nueva asignación
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Relaciona un profesor con una materia y un grupo.
        </p>
      </div>

      <div className="mt-5 rounded-xl bg-slate-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Ciclo escolar
        </p>

        <p className="mt-1 font-semibold text-slate-900">
          {activeAcademicPeriod?.name ||
            "Sin ciclo escolar activo"}
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <FormField
          label="Grupo"
          htmlFor="groupId"
        >
          <select
            id="groupId"
            name="groupId"
            required
            defaultValue=""
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="" disabled>
              Selecciona un grupo
            </option>

            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ·{" "}
                {group.grade_level?.name ?? "Sin grado"} ·{" "}
                {group.shift?.name ?? "Sin turno"}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Materia"
          htmlFor="subjectId"
          description="Debe tener carga curricular configurada para el grado del grupo."
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
          label="Profesor"
          htmlFor="teacherId"
          description="El sistema validará materia, turno y carga máxima."
        >
          <select
            id="teacherId"
            name="teacherId"
            required
            defaultValue=""
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="" disabled>
              Selecciona un profesor
            </option>

            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.first_name} {teacher.last_name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {!canCreate && (
        <div className="mt-5">
          <Alert type="warning">
            Debes tener un ciclo activo, grupos, materias y
            profesores activos.
          </Alert>
        </div>
      )}

      {state.message && (
        <div className="mt-5">
          <Alert type={state.success ? "success" : "error"}>
            {state.message}
          </Alert>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !canCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ClipboardPlus size={18} />

        {isPending
          ? "Registrando asignación..."
          : "Registrar asignación"}
      </button>
    </form>
  );
}