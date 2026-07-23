import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
} from "lucide-react";

export default function GeneratorReadinessCard({
  canGenerate,
  errorsCount,
  warningsCount,
}) {
  if (canGenerate) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
            <CheckCircle2 size={24} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-emerald-900">
              El sistema está listo para generar
            </h3>

            <p className="mt-2 text-sm leading-6 text-emerald-700">
              No se encontraron errores que impidan ejecutar el
              motor de horarios.
            </p>

            {warningsCount > 0 && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-700">
                <AlertTriangle size={17} />
                Existen {warningsCount} advertencias que conviene
                revisar.
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-red-100 p-3 text-red-700">
          <CircleX size={24} />
        </div>

        <div>
          <h3 className="text-lg font-bold text-red-900">
            La configuración todavía no está lista
          </h3>

          <p className="mt-2 text-sm leading-6 text-red-700">
            Corrige los {errorsCount} errores detectados antes de
            ejecutar el generador.
          </p>

          {warningsCount > 0 && (
            <p className="mt-3 text-sm font-medium text-amber-700">
              También existen {warningsCount} advertencias.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}