import Link from "next/link";
import {
  BookOpenCheck,
  Clock3,
  Power,
  PowerOff,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";
import {
  deleteTeacherAction,
  toggleTeacherAction,
} from "@/app/(dashboard)/profesores/actions";

export default function TeachersTable({ teachers }) {
  if (!teachers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Users
          className="mx-auto text-slate-400"
          size={34}
        />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay profesores registrados
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Registra al personal docente de la escuela.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="font-bold text-slate-900">
          Profesores registrados
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Configura las materias y turnos de cada profesor.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4">Profesor</th>
              <th className="px-6 py-4">Empleado</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4">Carga máxima</th>
              <th className="px-6 py-4">Materias</th>
              <th className="px-6 py-4">Turnos</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {teachers.map((teacher) => (
              <tr key={teacher.id}>
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-950">
                    {teacher.first_name} {teacher.last_name}
                  </p>

                  {teacher.notes && (
                    <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                      {teacher.notes}
                    </p>
                  )}
                </td>

                <td className="px-6 py-4 text-sm text-slate-600">
                  {teacher.employee_number || "Sin número"}
                </td>

                <td className="px-6 py-4 text-sm text-slate-600">
                  <p>{teacher.email || "Sin correo"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {teacher.phone || "Sin teléfono"}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-slate-700">
                    {teacher.max_weekly_periods} semanales
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {teacher.max_daily_periods} diarios
                  </p>
                </td>

                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    <BookOpenCheck size={14} />
                    {teacher.subjectsCount}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                    <Clock3 size={14} />
                    {teacher.shiftsCount}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      teacher.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {teacher.active ? "Activo" : "Inactivo"}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/profesores/${teacher.id}/configuracion`}
                      title="Configurar profesor"
                      className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
                    >
                      <Settings2 size={16} />
                    </Link>

                    <form action={toggleTeacherAction}>
                      <input
                        type="hidden"
                        name="teacherId"
                        value={teacher.id}
                      />

                      <input
                        type="hidden"
                        name="nextActive"
                        value={String(!teacher.active)}
                      />

                      <button
                        type="submit"
                        title={
                          teacher.active
                            ? "Desactivar profesor"
                            : "Activar profesor"
                        }
                        className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
                      >
                        {teacher.active ? (
                          <PowerOff size={16} />
                        ) : (
                          <Power size={16} />
                        )}
                      </button>
                    </form>

                    {teacher.assignmentsCount === 0 &&
                      teacher.availabilityCount === 0 &&
                      teacher.entriesCount === 0 && (
                        <form action={deleteTeacherAction}>
                          <input
                            type="hidden"
                            name="teacherId"
                            value={teacher.id}
                          />

                          <button
                            type="submit"
                            title="Eliminar profesor"
                            className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </form>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}