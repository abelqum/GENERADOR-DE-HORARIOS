"use client";
import Link from "next/link";
import {
  useActionState,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import {
  LoaderCircle,
  Save,
} from "lucide-react";
import { updateTeacherAction } from "@/app/(dashboard)/profesores/actions";
import {
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";

const initialState = {
  success: false,
  message: "",
};

export default function TeacherEditForm({
  teacher,
}) {
  const router = useRouter();

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    updateTeacherAction,
    initialState,
  );

  useEffect(() => {
    if (!state.message) {
      return;
    }

    async function showResult() {
      if (state.success) {
        await showSuccessAlert({
          title:
            "Profesor actualizado",
          text: state.message,
        });

        router.push("/profesores");
        router.refresh();

        return;
      }

      await showErrorAlert({
        title:
          "No fue posible actualizar",
        text: state.message,
      });
    }

    void showResult();
  }, [state, router]);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <input
        type="hidden"
        name="teacherId"
        value={teacher.id}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Nombre
          </label>

          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            defaultValue={
              teacher.first_name || ""
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Apellidos
          </label>

          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            defaultValue={
              teacher.last_name || ""
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="employeeNumber"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Número de empleado
          </label>

          <input
            id="employeeNumber"
            name="employeeNumber"
            type="text"
            defaultValue={
              teacher.employee_number || ""
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="active"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Estado
          </label>

          <select
            id="active"
            name="active"
            defaultValue={String(
              teacher.active,
            )}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          >
            <option value="true">
              Activo
            </option>

            <option value="false">
              Inactivo
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="maxWeeklyHours"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Máximo de horas semanales
          </label>

          <input
            id="maxWeeklyHours"
            name="maxWeeklyHours"
            type="number"
            min="1"
            required
            defaultValue={
              teacher.max_weekly_periods
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="maxDailyHours"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Máximo de horas diarias
          </label>

          <input
            id="maxDailyHours"
            name="maxDailyHours"
            type="number"
            min="1"
            required
            defaultValue={
              teacher.max_daily_periods
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Save size={18} />
          )}

          {isPending
            ? "Guardando..."
            : "Guardar cambios"}
        </button>

        <Link
          href={`/profesores/${teacher.id}/configuracion`}
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Configurar materias y turnos
        </Link>
      </div>
    </form>
  );
}