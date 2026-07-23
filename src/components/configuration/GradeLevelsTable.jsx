import {
  GraduationCap,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import {
  deleteGradeLevelAction,
  toggleGradeLevelAction,
} from "@/app/(dashboard)/configuracion/grados/actions";

export default function GradeLevelsTable({ gradeLevels }) {
  if (!gradeLevels.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <GraduationCap
          className="mx-auto text-slate-400"
          size={34}
        />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay grados registrados
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Registra Primero, Segundo y Tercero.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="font-bold text-slate-900">
          Grados registrados
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Los grupos estarán ligados a uno de estos grados.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4">Orden</th>
              <th className="px-6 py-4">Grado</th>
              <th className="px-6 py-4">Grupos</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {gradeLevels.map((gradeLevel) => (
              <tr key={gradeLevel.id}>
                <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                  {gradeLevel.order_number}
                </td>

                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-900">
                    {gradeLevel.name}
                  </p>
                </td>

                <td className="px-6 py-4 text-sm text-slate-600">
                  {gradeLevel.groupsCount}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      gradeLevel.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {gradeLevel.active ? "Activo" : "Inactivo"}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <form action={toggleGradeLevelAction}>
                      <input
                        type="hidden"
                        name="gradeLevelId"
                        value={gradeLevel.id}
                      />

                      <input
                        type="hidden"
                        name="nextActive"
                        value={String(!gradeLevel.active)}
                      />

                      <button
                        type="submit"
                        title={
                          gradeLevel.active
                            ? "Desactivar grado"
                            : "Activar grado"
                        }
                        className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
                      >
                        {gradeLevel.active ? (
                          <PowerOff size={16} />
                        ) : (
                          <Power size={16} />
                        )}
                      </button>
                    </form>

                    {gradeLevel.groupsCount === 0 && (
                      <form action={deleteGradeLevelAction}>
                        <input
                          type="hidden"
                          name="gradeLevelId"
                          value={gradeLevel.id}
                        />

                        <button
                          type="submit"
                          title="Eliminar grado"
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