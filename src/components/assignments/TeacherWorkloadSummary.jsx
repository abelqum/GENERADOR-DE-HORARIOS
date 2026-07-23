import { Gauge, UserRound } from "lucide-react";

export default function TeacherWorkloadSummary({
  workloads,
}) {
  if (!workloads.length) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="flex items-center gap-2 font-bold text-slate-900">
          <Gauge size={19} />
          Carga docente
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Horas asignadas respecto al máximo semanal.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workloads.map((workload) => {
          const percentage =
            workload.maxWeeklyPeriods > 0
              ? Math.min(
                  100,
                  Math.round(
                    (workload.assignedPeriods /
                      workload.maxWeeklyPeriods) *
                      100,
                  ),
                )
              : 0;

          const isOverloaded =
            workload.assignedPeriods >
            workload.maxWeeklyPeriods;

          return (
            <article
              key={workload.teacherId}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                  <UserRound size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {workload.teacherName}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {workload.assignedPeriods} de{" "}
                    {workload.maxWeeklyPeriods} horas
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    isOverloaded
                      ? "bg-red-500"
                      : percentage >= 90
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>

              <p
                className={`mt-2 text-xs font-semibold ${
                  isOverloaded
                    ? "text-red-600"
                    : "text-slate-500"
                }`}
              >
                {isOverloaded
                  ? "Carga excedida"
                  : `${percentage}% utilizado`}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}