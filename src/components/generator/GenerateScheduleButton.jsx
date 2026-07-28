"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarCog,
  CheckCircle2,
  Database,
  LoaderCircle,
  Save,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { generateScheduleAction } from "@/app/(dashboard)/generador/actions";
import Alert from "@/components/ui/Alert";

const initialState = {
  success: false,
  message: "",
  versionId: null,
  solverStatus: null,
  errorCode: null,
  diagnostics: [],
  relaxedEntriesCount: 0,
  relaxedRequiredEntries: 0,
};

const generationStages = [
  {
    minimumSeconds: 0,
    label: "Validando la configuración escolar",
    description:
      "Revisando grupos, profesores, materias, talleres y restricciones.",
    icon: ShieldCheck,
  },
  {
    minimumSeconds: 2,
    label: "Preparando la información",
    description: "Construyendo los datos que recibirá el motor de horarios.",
    icon: Database,
  },
  {
    minimumSeconds: 5,
    label: "Buscando una solución estricta",
    description: "OR-Tools está evaluando combinaciones sin empalmes.",
    icon: ServerCog,
  },
  {
    minimumSeconds: 20,
    label: "Analizando restricciones",
    description:
      "Si no existe una solución exacta, se calcula el ajuste mínimo necesario.",
    icon: Wrench,
  },
  {
    minimumSeconds: 45,
    label: "Finalizando la generación",
    description: "Validando el resultado y preparando la respuesta.",
    icon: Save,
  },
];

const diagnosticLabels = {
  unassigned_periods: "Horas sin colocar",
  teacher_unavailable: "Disponibilidad docente",
  assignment_min_days: "Días mínimos",
  assignment_daily_excess: "Máximo diario de materia",
  teacher_daily_excess: "Máximo diario del docente",
  teacher_weekly_excess: "Máximo semanal del docente",
  configuration: "Configuración",
};

function getCurrentStage(elapsedSeconds) {
  return generationStages.reduce(
    (currentStage, stage) =>
      elapsedSeconds >= stage.minimumSeconds ? stage : currentStage,
    generationStages[0],
  );
}

function DiagnosticItem({ diagnostic, index }) {
  const isCritical = diagnostic.severity === "critical";

  const Icon = isCritical ? ShieldAlert : AlertTriangle;

  return (
    <article
      className={`rounded-xl border p-4 ${
        isCritical ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-lg p-2 ${
            isCritical
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          <Icon size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-xs font-bold uppercase tracking-wide ${
                isCritical ? "text-red-700" : "text-amber-700"
              }`}
            >
              {index + 1}. {diagnosticLabels[diagnostic.type] || "Restricción"}
            </p>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                isCritical
                  ? "bg-red-200 text-red-800"
                  : "bg-amber-200 text-amber-800"
              }`}
            >
              {isCritical ? "Crítica" : "Ajustable"}
            </span>
          </div>

          <p className="mt-2 text-sm font-medium leading-6 text-slate-900">
            {diagnostic.message}
          </p>

          {diagnostic.suggestion && (
            <div className="mt-3 rounded-lg bg-white/80 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Recomendación
              </p>

              <p className="mt-1 text-sm leading-5 text-slate-700">
                {diagnostic.suggestion}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function GenerateScheduleButton({ canGenerate }) {
  const router = useRouter();

  const hasRedirectedRef = useRef(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [state, formAction, isPending] = useActionState(
    generateScheduleAction,
    initialState,
  );

  useEffect(() => {
    if (!isPending) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((currentValue) => currentValue + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPending]);

  useEffect(() => {
    if (!state.success || !state.versionId || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;

    router.push(`/horarios/${state.versionId}`);

    router.refresh();
  }, [state.success, state.versionId, router]);

  function handleSubmit() {
    setElapsedSeconds(0);
    hasRedirectedRef.current = false;
  }

  const currentStage = getCurrentStage(elapsedSeconds);

  const StageIcon = currentStage.icon;

  const diagnostics = Array.isArray(state.diagnostics) ? state.diagnostics : [];

  const hasDiagnosticAlternative =
    state.relaxedRequiredEntries > 0 && state.relaxedEntriesCount > 0;

  return (
    <div className="w-full sm:w-auto">
      <form action={formAction} onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={!canGenerate || isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {isPending ? (
            <LoaderCircle size={19} className="animate-spin" />
          ) : (
            <CalendarCog size={19} />
          )}

          {isPending ? "Generando horario..." : "Generar horario"}
        </button>
      </form>

      {!canGenerate && !isPending && (
        <p className="mt-2 max-w-sm text-xs leading-5 text-red-600">
          Corrige los errores de validación antes de ejecutar el generador.
        </p>
      )}

      {isPending && (
        <div className="mt-4 max-w-md rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
              <StageIcon
                size={20}
                className={
                  currentStage.icon === ServerCog ? "animate-pulse" : ""
                }
              />
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-blue-950">
                {currentStage.label}
              </p>

              <p className="mt-1 text-sm leading-5 text-blue-700">
                {currentStage.description}
              </p>

              <p className="mt-2 text-xs font-medium text-blue-600">
                Tiempo transcurrido: {elapsedSeconds} s
              </p>
            </div>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
          </div>
        </div>
      )}

      {state.message && !state.success && !isPending && (
        <div className="mt-4 max-w-3xl space-y-4">
          <Alert type="error">
            <div>
              <p className="font-semibold">
                No se pudo generar el horario estricto
              </p>

              <p className="mt-1">{state.message}</p>

              {state.solverStatus && (
                <p className="mt-2 text-xs opacity-75">
                  Estado del solver: {state.solverStatus}
                </p>
              )}
            </div>
          </Alert>

          {hasDiagnosticAlternative && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Wrench size={19} className="mt-0.5 shrink-0 text-blue-700" />

                <div>
                  <p className="font-semibold text-blue-950">
                    Alternativa diagnóstica
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    El solver logró colocar{" "}
                    <strong>{state.relaxedEntriesCount}</strong> de{" "}
                    <strong>{state.relaxedRequiredEntries}</strong> clases al
                    permitir únicamente los ajustes listados abajo.
                  </p>

                  <p className="mt-2 text-xs font-medium text-blue-600">
                    Esta alternativa no se guardó como horario válido.
                  </p>
                </div>
              </div>
            </div>
          )}

          {diagnostics.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>
                  <h3 className="font-bold text-slate-950">
                    Restricciones que impiden el horario
                  </h3>

                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Corrige primero las restricciones críticas. Después vuelve a
                    generar para comprobar si ya existe una solución estricta.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {diagnostics.map((diagnostic, index) => (
                  <DiagnosticItem
                    key={`${diagnostic.type}-${diagnostic.assignmentId || "none"}-${diagnostic.teacherId || "none"}-${diagnostic.dayOfWeek || "none"}-${index}`}
                    diagnostic={diagnostic}
                    index={index}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {state.success && !isPending && (
        <div className="mt-4 max-w-lg">
          <Alert type="success">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={17} />

              {state.message}
            </span>
          </Alert>
        </div>
      )}
    </div>
  );
}
