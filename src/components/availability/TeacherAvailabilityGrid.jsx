import {
  CalendarClock,
  Coffee,
} from "lucide-react";
import AvailabilityCell from "@/components/availability/AvailabilityCell";
import { SCHOOL_DAYS } from "@/constants/days";
import { formatTime } from "@/utils/time";

function createAvailabilityMap(records) {
  return new Map(
    records.map((record) => [
      `${record.day_of_week}-${record.shift_period_id}`,
      record.availability_type,
    ]),
  );
}

export default function TeacherAvailabilityGrid({
  teacher,
  teacherShifts,
  availability,
}) {
  const availabilityMap =
    createAvailabilityMap(availability);

  if (!teacher) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <CalendarClock
          className="mx-auto text-slate-400"
          size={38}
        />

        <h3 className="mt-4 font-bold text-slate-900">
          Selecciona un profesor
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          La cuadrícula semanal aparecerá aquí.
        </p>
      </div>
    );
  }

  if (!teacherShifts.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <CalendarClock
          className="mx-auto text-amber-600"
          size={34}
        />

        <h3 className="mt-4 font-bold text-amber-900">
          Profesor sin turnos
        </h3>

        <p className="mt-2 text-sm text-amber-700">
          Primero asigna al profesor uno o más turnos desde
          su configuración.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {teacherShifts.map((teacherShift) => {
        const shift = teacherShift.shift;

        const periods = (
          shift?.shift_periods ?? []
        ).filter((period) => period.active);

        return (
          <section
            key={teacherShift.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="font-bold text-slate-900">
                Turno {shift?.name}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {formatTime(shift?.start_time)} –{" "}
                {formatTime(shift?.end_time)}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="sticky left-0 z-10 min-w-[190px] border-b border-r border-slate-200 bg-slate-50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                     Hora
                    </th>

                    {SCHOOL_DAYS.map((day) => (
                      <th
                        key={day.value}
                        className="min-w-[150px] border-b border-r border-slate-200 px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 last:border-r-0"
                      >
                        {day.name}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {periods.map((period) => {
                    const isClass =
                      period.period_type === "class";

                    return (
                      <tr key={period.id}>
                        <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {period.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatTime(period.start_time)} –{" "}
                              {formatTime(period.end_time)}
                            </p>

                            {!isClass && (
                              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                <Coffee size={12} />
                                {period.period_type ===
                                "recess"
                                  ? "Receso"
                                  : "No disponible"}
                              </span>
                            )}
                          </div>
                        </td>

                        {SCHOOL_DAYS.map((day) => {
                          const currentType =
                            availabilityMap.get(
                              `${day.value}-${period.id}`,
                            ) || "available";

                          return (
                            <td
                              key={day.value}
                              className="border-b border-r border-slate-200 p-3 last:border-r-0"
                            >
                              {isClass ? (
                                <AvailabilityCell
                                  teacherId={teacher.id}
                                  dayOfWeek={day.value}
                                  periodId={period.id}
                                  initialType={currentType}
                                />
                              ) : (
                                <div className="rounded-lg bg-slate-100 px-3 py-3 text-center text-xs font-medium text-slate-400">
                                  No aplica
                                </div>
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
        );
      })}
    </div>
  );
}