import {
  Coffee,
  LockKeyhole,
} from "lucide-react";
import ScheduleClassCard from "@/components/schedules/ScheduleClassCard";
import { SCHOOL_DAYS } from "@/constants/days";
import {
  createScheduleEntriesMap,
  createScheduleEntryKey,
} from "@/lib/scheduler/scheduleView";
import { formatTime } from "@/utils/time";

function EmptySlot() {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-center text-xs font-medium text-slate-400">
      Espacio libre
    </div>
  );
}

function NonClassSlot({ period }) {
  const isRecess =
    period.period_type === "recess";

  const Icon = isRecess
    ? Coffee
    : LockKeyhole;

  return (
    <div
      className={`flex min-h-20 items-center justify-center gap-2 rounded-xl border px-3 text-center text-xs font-semibold ${
        isRecess
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-300 bg-slate-100 text-slate-500"
      }`}
    >
      <Icon size={15} />

      {isRecess
        ? "Receso"
        : "No disponible"}
    </div>
  );
}

export default function ScheduleGrid({
  shifts,
  entries,
  view,
}) {
  const entriesMap =
    createScheduleEntriesMap(entries);

  if (!shifts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h3 className="font-bold text-slate-900">
          No existen horas configuradas
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Configura turnos y horas para visualizar el horario.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {shifts.map((shift) => (
        <section
          key={shift.id}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 px-6 py-5">
            <h3 className="font-bold text-slate-950">
              Turno {shift.name}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {formatTime(shift.start_time)} –{" "}
              {formatTime(shift.end_time)}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-20 min-w-52 border-b border-r border-slate-200 bg-slate-50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Periodo
                  </th>

                  {SCHOOL_DAYS.map((day) => (
                    <th
                      key={day.value}
                      className="min-w-44 border-b border-r border-slate-200 px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 last:border-r-0"
                    >
                      {day.name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {shift.periods.map((period) => {
                  const isClass =
                    period.period_type ===
                    "class";

                  return (
                    <tr key={period.id}>
                      <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-5 py-4 align-top">
                        <p className="font-semibold text-slate-900">
                          {period.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatTime(
                            period.start_time,
                          )}{" "}
                          –{" "}
                          {formatTime(
                            period.end_time,
                          )}
                        </p>
                      </td>

                      {SCHOOL_DAYS.map((day) => {
                        const entry =
                          entriesMap.get(
                            createScheduleEntryKey(
                              day.value,
                              period.id,
                            ),
                          );

                        return (
                          <td
                            key={day.value}
                            className="border-b border-r border-slate-200 p-3 align-top last:border-r-0"
                          >
                            {!isClass ? (
                              <NonClassSlot
                                period={period}
                              />
                            ) : entry ? (
                              <ScheduleClassCard
                                entry={entry}
                                view={view}
                              />
                            ) : (
                              <EmptySlot />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}