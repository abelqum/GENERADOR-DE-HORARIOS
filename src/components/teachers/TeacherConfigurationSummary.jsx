import {
  BookOpenCheck,
  Clock3,
  Star,
  Trash2,
} from "lucide-react";
import {
  deleteTeacherShiftAction,
  deleteTeacherSubjectAction,
} from "@/app/(dashboard)/profesores/[teacherId]/configuracion/actions";
import { formatTime } from "@/utils/time";

export default function TeacherConfigurationSummary({
  teacher,
  teacherSubjects,
  teacherShifts,
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <BookOpenCheck size={19} />
            Materias autorizadas
          </h3>
        </div>

        {teacherSubjects.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            Este profesor todavía no tiene materias asignadas.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {teacherSubjects.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{
                      backgroundColor:
                        item.subject?.color || "#334155",
                    }}
                  />

                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.subject?.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Prioridad {item.priority}
                    </p>
                  </div>

                  {item.is_primary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      <Star size={12} />
                      Principal
                    </span>
                  )}
                </div>

                <form action={deleteTeacherSubjectAction}>
                  <input
                    type="hidden"
                    name="teacherSubjectId"
                    value={item.id}
                  />

                  <input
                    type="hidden"
                    name="teacherId"
                    value={teacher.id}
                  />

                  <button
                    type="submit"
                    title="Eliminar materia"
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <Clock3 size={19} />
            Turnos autorizados
          </h3>
        </div>

        {teacherShifts.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            Este profesor todavía no tiene turnos asignados.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {teacherShifts.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.shift?.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatTime(item.shift?.start_time)} –{" "}
                    {formatTime(item.shift?.end_time)}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Máximo: {item.max_weekly_periods} horas
                  </p>
                </div>

                <form action={deleteTeacherShiftAction}>
                  <input
                    type="hidden"
                    name="teacherShiftId"
                    value={item.id}
                  />

                  <input
                    type="hidden"
                    name="teacherId"
                    value={teacher.id}
                  />

                  <button
                    type="submit"
                    title="Eliminar turno"
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}