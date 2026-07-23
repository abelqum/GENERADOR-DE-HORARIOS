"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCog,
  CheckCircle2,
  Database,
  LoaderCircle,
  Save,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import {
  generateScheduleAction,
} from "@/app/(dashboard)/generador/actions";
import Alert from "@/components/ui/Alert";

const initialState = {
  success: false,
  message: "",
  versionId: null,
  solverStatus: null,
  errorCode: null,
};

const generationStages = [
  {
    minimumSeconds: 0,
    label:
      "Validando la configuración escolar",
    description:
      "Revisando grupos, profesores, materias y restricciones.",
    icon: ShieldCheck,
  },
  {
    minimumSeconds: 2,
    label:
      "Preparando la información",
    description:
      "Construyendo los datos que recibirá el motor de horarios.",
    icon: Database,
  },
  {
    minimumSeconds: 5,
    label:
      "Buscando una solución",
    description:
      "OR-Tools está evaluando combinaciones sin empalmes.",
    icon: ServerCog,
  },
  {
    minimumSeconds: 15,
    label:
      "Optimizando el resultado",
    description:
      "Buscando una mejor distribución de clases y preferencias.",
    icon: CalendarCog,
  },
  {
    minimumSeconds: 35,
    label:
      "Finalizando la generación",
    description:
      "Validando y preparando el horario para guardarlo.",
    icon: Save,
  },
];

function getCurrentStage(elapsedSeconds) {
  return generationStages.reduce(
    (currentStage, stage) =>
      elapsedSeconds >=
      stage.minimumSeconds
        ? stage
        : currentStage,
    generationStages[0],
  );
}

export default function GenerateScheduleButton({
  canGenerate,
}) {
  const router = useRouter();

  const hasRedirectedRef =
    useRef(false);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    generateScheduleAction,
    initialState,
  );

  /*
   * El efecto solamente se suscribe al temporizador.
   * No reinicia estado directamente.
   */
  useEffect(() => {
    if (!isPending) {
      return undefined;
    }

    const intervalId =
      window.setInterval(() => {
        setElapsedSeconds(
          (currentValue) =>
            currentValue + 1,
        );
      }, 1000);

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [isPending]);

  useEffect(() => {
    if (
      !state.success ||
      !state.versionId ||
      hasRedirectedRef.current
    ) {
      return;
    }

    hasRedirectedRef.current = true;

    router.push(
      `/horarios/${state.versionId}`,
    );

    router.refresh();
  }, [
    state.success,
    state.versionId,
    router,
  ]);

  function handleSubmit() {
    /*
     * Reiniciamos el contador en respuesta directa
     * al envío del usuario.
     */
    setElapsedSeconds(0);
    hasRedirectedRef.current = false;
  }

  const currentStage =
    getCurrentStage(
      elapsedSeconds,
    );

  const StageIcon =
    currentStage.icon;

  return (
    <div className="w-full sm:w-auto">
      <form
        action={formAction}
        onSubmit={handleSubmit}
      >
        <button
          type="submit"
          disabled={
            !canGenerate ||
            isPending
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {isPending ? (
            <LoaderCircle
              size={19}
              className="animate-spin"
            />
          ) : (
            <CalendarCog size={19} />
          )}

          {isPending
            ? "Generando horario..."
            : "Generar horario"}
        </button>
      </form>

      {!canGenerate &&
        !isPending && (
          <p className="mt-2 max-w-sm text-xs leading-5 text-red-600">
            Corrige los errores de validación antes de ejecutar
            el generador.
          </p>
        )}

      {isPending && (
        <div className="mt-4 max-w-md rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
              <StageIcon
                size={20}
                className={
                  currentStage.icon ===
                  ServerCog
                    ? "animate-pulse"
                    : ""
                }
              />
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-blue-950">
                {currentStage.label}
              </p>

              <p className="mt-1 text-sm leading-5 text-blue-700">
                {
                  currentStage.description
                }
              </p>

              <p className="mt-2 text-xs font-medium text-blue-600">
                Tiempo transcurrido:{" "}
                {elapsedSeconds} s
              </p>
            </div>
          </div>

          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
          </div>
        </div>
      )}

      {state.message &&
        !state.success &&
        !isPending && (
          <div className="mt-4 max-w-lg">
            <Alert type="error">
              <div>
                <p className="font-semibold">
                  No se pudo generar el horario
                </p>

                <p className="mt-1">
                  {state.message}
                </p>

                {state.solverStatus && (
                  <p className="mt-2 text-xs opacity-75">
                    Estado del solver:{" "}
                    {
                      state.solverStatus
                    }
                  </p>
                )}
              </div>
            </Alert>
          </div>
        )}

      {state.success &&
        !isPending && (
          <div className="mt-4 max-w-lg">
            <Alert type="success">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2
                  size={17}
                />

                {state.message}
              </span>
            </Alert>
          </div>
        )}
    </div>
  );
}