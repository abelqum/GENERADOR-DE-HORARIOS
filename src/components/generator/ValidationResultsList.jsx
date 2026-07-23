import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  Info,
  MoveRight,
} from "lucide-react";

const levelConfiguration = {
  error: {
    icon: CircleX,
    label: "Error",
    containerClassName:
      "border-red-200 bg-red-50",
    iconClassName:
      "bg-red-100 text-red-700",
    titleClassName:
      "text-red-900",
    messageClassName:
      "text-red-700",
  },

  warning: {
    icon: AlertTriangle,
    label: "Advertencia",
    containerClassName:
      "border-amber-200 bg-amber-50",
    iconClassName:
      "bg-amber-100 text-amber-700",
    titleClassName:
      "text-amber-900",
    messageClassName:
      "text-amber-700",
  },

  success: {
    icon: CheckCircle2,
    label: "Correcto",
    containerClassName:
      "border-emerald-200 bg-emerald-50",
    iconClassName:
      "bg-emerald-100 text-emerald-700",
    titleClassName:
      "text-emerald-900",
    messageClassName:
      "text-emerald-700",
  },

  info: {
    icon: Info,
    label: "Información",
    containerClassName:
      "border-blue-200 bg-blue-50",
    iconClassName:
      "bg-blue-100 text-blue-700",
    titleClassName:
      "text-blue-900",
    messageClassName:
      "text-blue-700",
  },
};

const moduleRoutes = {
  "Ciclos escolares": "/configuracion/ciclos",
  Turnos: "/configuracion/turnos",
  Periodos: "/configuracion/periodos",
  Grupos: "/grupos",
  Materias: "/materias",
  "Carga curricular": "/materias/carga",
  Profesores: "/profesores",
  Asignaciones: "/asignaciones",
  Disponibilidad: "/disponibilidad",
  Generador: "/generador",
};

export default function ValidationResultsList({
  results,
}) {
  if (!results.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Info
          className="mx-auto text-slate-400"
          size={34}
        />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay resultados
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Ejecuta nuevamente la validación.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {results.map((result) => {
        const configuration =
          levelConfiguration[result.level] ??
          levelConfiguration.info;

        const Icon = configuration.icon;
        const route = moduleRoutes[result.module];

        return (
          <article
            key={result.id}
            className={`rounded-2xl border p-5 ${configuration.containerClassName}`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 rounded-xl p-3 ${configuration.iconClassName}`}
              >
                <Icon size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                    {configuration.label}
                  </span>

                  <span className="text-xs font-semibold opacity-70">
                    {result.module}
                  </span>
                </div>

                <h3
                  className={`mt-3 font-bold ${configuration.titleClassName}`}
                >
                  {result.title}
                </h3>

                <p
                  className={`mt-2 text-sm leading-6 ${configuration.messageClassName}`}
                >
                  {result.message}
                </p>

                {route && result.level !== "success" && (
                  <Link
                    href={route}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
                  >
                    Revisar módulo
                    <MoveRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}