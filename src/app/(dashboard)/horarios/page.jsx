import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Horarios",
};

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) {
    return "Fecha desconocida";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

const solverStatusLabels = {
  optimal: "Óptimo",
  feasible: "Válido",
  infeasible: "No factible",
  model_invalid: "Modelo inválido",
  unknown: "Desconocido",
  error: "Error",
};

export default async function SchedulesPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const {
    data: activeAcademicPeriod,
  } = await supabase
    .from("academic_periods")
    .select("id, name")
    .eq("school_id", school.id)
    .eq("active", true)
    .maybeSingle();

  let versions = [];

  if (activeAcademicPeriod) {
    const { data, error } = await supabase
      .from("schedule_versions")
      .select(`
        id,
        name,
        status,
        solver_status,
        objective_value,
        created_at,
        schedule_entries (
          id
        )
      `)
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Error obteniendo versiones:",
        error,
      );
    }

    versions = data ?? [];
  }
const versionStatusConfiguration = {
  draft: {
    label: "Borrador",
    className:
      "bg-blue-100 text-blue-700",
  },

  published: {
    label: "Publicado",
    className:
      "bg-emerald-100 text-emerald-700",
  },

  archived: {
    label: "Archivado",
    className:
      "bg-slate-200 text-slate-600",
  },
};
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Resultados
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Horarios generados
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Consulta las diferentes versiones generadas para el
          ciclo escolar activo.
        </p>
      </section>

      {!versions.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CalendarDays
            className="mx-auto text-slate-400"
            size={38}
          />

          <h3 className="mt-4 font-bold text-slate-900">
            No hay horarios generados
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Ejecuta el generador para crear la primera versión.
          </p>

          <Link
            href="/generador"
            className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Ir al generador
          </Link>
        </div>
      ) : (
        <section className="grid gap-4">
          {versions.map((version) => {
            const entriesCount =
              version.schedule_entries?.length ?? 0;
const statusConfiguration =
  versionStatusConfiguration[
    version.status
  ] ??
  versionStatusConfiguration.draft;
            return (
              <Link
                key={version.id}
                href={`/horarios/${version.id}`}
                className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-950">
                      {version.name ||
                        "Horario sin nombre"}
                    </h3>

                   <span
  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusConfiguration.className}`}
>
  {statusConfiguration.label}
</span>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {solverStatusLabels[
                        version.solver_status
                      ] ||
                        version.solver_status ||
                        "Sin estado"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    {entriesCount} clases ·{" "}
                    {formatDate(version.created_at)}
                  </p>

                  {version.objective_value !== null && (
                    <p className="mt-1 text-xs text-slate-400">
                      Puntuación:{" "}
                      {version.objective_value}
                    </p>
                  )}
                </div>

                <ChevronRight
                  className="text-slate-400"
                  size={22}
                />
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}