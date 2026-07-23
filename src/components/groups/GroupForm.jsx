"use client";

import { useActionState, useEffect, useRef } from "react";
import { UsersRound } from "lucide-react";
import { createGroupAction } from "@/app/(dashboard)/grupos/actions";
import Alert from "@/components/ui/Alert";
import FormField from "@/components/ui/FormField";

const initialState = {
  success: false,
  message: "",
};

export default function GroupForm({
  gradeLevels,
  shifts,
  activeAcademicPeriod,
}) {
  const formRef = useRef(null);

  const [state, formAction, isPending] = useActionState(
    createGroupAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  const canCreate =
    Boolean(activeAcademicPeriod) &&
    gradeLevels.length > 0 &&
    shifts.length > 0;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          Nuevo grupo
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Registra un grupo dentro del ciclo escolar activo.
        </p>
      </div>

      <div className="mt-5 rounded-xl bg-slate-100 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Ciclo escolar
        </p>

        <p className="mt-1 font-semibold text-slate-900">
          {activeAcademicPeriod?.name ||
            "No existe un ciclo activo"}
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <FormField
          label="Nombre del grupo"
          htmlFor="name"
          description="Por ejemplo: 1A, 1B, 2A o 3C."
        >
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={50}
            placeholder="1A"
            className="w-full uppercase rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
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
          label="Cantidad de estudiantes"
          htmlFor="studentCount"
          description="Este dato es opcional."
        >
          <input
            id="studentCount"
            name="studentCount"
            type="number"
            min={0}
            step={1}
            placeholder="35"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </FormField>
      </div>

      {!canCreate && (
        <div className="mt-5">
          <Alert type="warning">
            Debes tener un ciclo activo, al menos un grado y
            un turno activo antes de registrar grupos.
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
        <UsersRound size={18} />

        {isPending ? "Registrando grupo..." : "Registrar grupo"}
      </button>
    </form>
  );
}