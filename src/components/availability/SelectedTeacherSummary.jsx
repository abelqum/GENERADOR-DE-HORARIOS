import {
  BookOpenCheck,
  Clock3,
  UserRound,
} from "lucide-react";

export default function SelectedTeacherSummary({
  teacher,
  teacherShifts,
}) {
  if (!teacher) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-slate-950 p-3 text-white">
          <UserRound size={22} />
        </div>

        <div>
          <h3 className="font-bold text-slate-950">
            {teacher.first_name} {teacher.last_name}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {teacher.employee_number ||
              "Sin número de empleado"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <BookOpenCheck size={15} />
            Carga máxima
          </p>

          <p className="mt-2 font-bold text-slate-900">
            {teacher.max_weekly_periods} semanales
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {teacher.max_daily_periods} diarios
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Clock3 size={15} />
            Turnos
          </p>

          <p className="mt-2 font-bold text-slate-900">
            {teacherShifts.length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Turnos autorizados
          </p>
        </div>
      </div>
    </section>
  );
}