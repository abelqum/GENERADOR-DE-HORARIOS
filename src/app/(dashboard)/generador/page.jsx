import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  Users,
} from "lucide-react";
import GenerateScheduleButton from "@/components/generator/GenerateScheduleButton";
import GeneratorReadinessCard from "@/components/generator/GeneratorReadinessCard";
import RevalidateButton from "@/components/generator/RevalidateButton";
import ValidationResultsPanel from "@/components/generator/ValidationResultsPanel";
import ValidationStatCard from "@/components/generator/ValidationStatCard";
import { validateScheduleConfiguration } from "@/lib/scheduler/validateScheduleConfiguration";

export const metadata = {
  title: "Generador",
};

export const dynamic = "force-dynamic";

export default async function GeneratorPage() {
  const validation =
    await validateScheduleConfiguration();

  const statistics = validation.statistics ?? {};

  const checkedAt = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(validation.checkedAt));

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Motor de horarios
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Generador automático
          </h2>

          <p className="mt-2 max-w-3xl text-slate-600">
            Verifica la configuración escolar antes de enviar
            la información al motor OR-Tools.
          </p>

          <p className="mt-3 text-xs text-slate-400">
            Última validación: {checkedAt}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <RevalidateButton />

          <GenerateScheduleButton
            canGenerate={validation.canGenerate}
          />
        </div>
      </section>

      <GeneratorReadinessCard
        canGenerate={validation.canGenerate}
        errorsCount={validation.errors.length}
        warningsCount={validation.warnings.length}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ValidationStatCard
          label="Grupos"
          value={statistics.groups ?? 0}
          description="Grupos del ciclo activo"
          icon={Users}
        />

        <ValidationStatCard
          label="Profesores"
          value={statistics.teachers ?? 0}
          description="Profesores activos"
          icon={Users}
        />

        <ValidationStatCard
          label="Asignaciones"
          value={statistics.assignments ?? 0}
          description="Relaciones grupo-materia-profesor"
          icon={ClipboardList}
        />

        <ValidationStatCard
          label="Clases semanales"
          value={statistics.weeklyLessons ?? 0}
          description="Horas que deberá colocar el solver"
          icon={CalendarClock}
        />
      </section>

      {validation.activeAcademicPeriod && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <BookOpen size={21} />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">
                Ciclo escolar validado
              </p>

              <h3 className="mt-1 text-lg font-bold text-slate-950">
                {validation.activeAcademicPeriod.name}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Escuela: {validation.school.name}
              </p>
            </div>
          </div>
        </section>
      )}

      <ValidationResultsPanel
        results={validation.results}
      />
    </div>
  );
}