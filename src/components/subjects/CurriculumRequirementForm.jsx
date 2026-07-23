"use client";

import { useActionState, useEffect, useRef } from "react";
import { ClipboardPlus } from "lucide-react";
import { saveCurriculumRequirementAction } from "@/app/(dashboard)/materias/carga/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function CurriculumRequirementForm({
  subjects,
  gradeLevels,
  activeAcademicPeriod,
}) {
  const formRef = useRef(null);

  const [state, formAction, isPending] = useActionState(
    saveCurriculumRequirementAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  const canCreate =
    Boolean(activeAcademicPeriod) &&
    subjects.length > 0 &&
    gradeLevels.length > 0;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Configurar carga
        </h3>

        <p className="mt-1 text-sm text-slate-500">
        Define cuántas horas recibe un grado por materia durante la semana.
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
          label="Grado"
          htmlFor="gradeLevelId"
        >
          <select
            id="gradeLevelId"
            name="gradeLevelId"
            required
            defaultValue=""
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="" disabled>
              Selecciona un grado
            </option>

            {gradeLevels.map((gradeLevel) => (
              <option
                key={gradeLevel.id}
                value={gradeLevel.id}
              >
                {gradeLevel.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Horas semanales"
            htmlFor="weeklyPeriods"
          >
            <input
              id="weeklyPeriods"
              name="weeklyPeriods"
              type="number"
              required
              min={1}
              max={50}
              step={1}
              defaultValue={5}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>

          <FormField
            label="Máximo por día"
            htmlFor="maxPeriodsPerDay"
          >
            <input
              id="maxPeriodsPerDay"
              name="maxPeriodsPerDay"
              type="number"
              required
              min={1}
              max={10}
              step={1}
              defaultValue={1}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Mínimo de días"
            htmlFor="minDaysPerWeek"
          >
            <input
              id="minDaysPerWeek"
              name="minDaysPerWeek"
              type="number"
              required
              min={1}
              max={7}
              step={1}
              defaultValue={5}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>

          <FormField
            label="Tamaño de bloque"
            htmlFor="preferredBlockSize"
            description="Usa 2 para clases dobles."
          >
            <input
              id="preferredBlockSize"
              name="preferredBlockSize"
              type="number"
              required
              min={1}
              max={5}
              step={1}
              defaultValue={1}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            />
          </FormField>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            name="allowConsecutivePeriods"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
          />

          <span>
            <span className="block text-sm font-medium text-slate-800">
              Permitir clases consecutivas
            </span>

            <span className="block text-xs text-slate-500">
              Actívalo para laboratorios, talleres o bloques
              dobles.
            </span>
          </span>
        </label>
      </div>

      {!canCreate && (
        <div className="mt-5">
          <Alert type="warning">
            Debes tener un ciclo activo, grados y materias
            activas.
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
          ? "Guardando carga..."
          : "Guardar carga curricular"}
      </button>
    </form>
  );
}