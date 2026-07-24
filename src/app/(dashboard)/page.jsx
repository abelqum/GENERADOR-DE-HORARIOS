import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Settings,
  Users,
} from "lucide-react";

import StatCard from "@/components/ui/StatCard";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

const quickActions = [
  {
    title: "Registrar profesor",
    description: "Agrega profesores, materias y disponibilidad.",
    href: "/profesores",
    icon: Users,
  },
  {
    title: "Registrar materias",
    description: "Configura materias y cargas semanales por grado.",
    href: "/materias",
    icon: BookOpen,
  },
  {
    title: "Configurar grupos",
    description: "Crea los grupos y relaciona cada uno con su grado y turno.",
    href: "/grupos",
    icon: GraduationCap,
  },
  {
    title: "Generar horario",
    description: "Valida los datos y genera una nueva versión del horario.",
    href: "/generador",
    icon: CalendarClock,
  },
];

const versionStatusConfiguration = {
  draft: {
    label: "Borrador",
    className: "bg-blue-100 text-blue-700",
  },
  published: {
    label: "Publicado",
    className: "bg-emerald-100 text-emerald-700",
  },
  archived: {
    label: "Archivado",
    className: "bg-slate-200 text-slate-600",
  },
};

const solverStatusLabels = {
  optimal: "Óptimo",
  feasible: "Válido",
  infeasible: "No factible",
  model_invalid: "Modelo inválido",
  unknown: "Desconocido",
  error: "Error",
};

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

function logSupabaseError(title, error) {
  if (!error) {
    return;
  }

  console.error(title, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
}

export default async function HomePage() {
  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: activeAcademicPeriod, error: activeAcademicPeriodError } =
    await supabase
      .from("academic_periods")
      .select(
        `
      id,
      name,
      start_date,
      end_date
    `,
      )
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle();

  logSupabaseError("Error obteniendo ciclo activo:", activeAcademicPeriodError);

  const [
    { count: teachersCount, error: teachersError },
    { count: subjectsCount, error: subjectsError },
    { count: groupsCount, error: groupsError },
    { count: schedulesCount, error: schedulesError },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("active", true),

    supabase
      .from("subjects")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("active", true),

    activeAcademicPeriod
      ? supabase
          .from("groups")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("school_id", school.id)
          .eq("academic_period_id", activeAcademicPeriod.id)
          .eq("active", true)
      : Promise.resolve({
          count: 0,
          error: null,
        }),

    activeAcademicPeriod
      ? supabase
          .from("schedule_versions")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("school_id", school.id)
          .eq("academic_period_id", activeAcademicPeriod.id)
      : Promise.resolve({
          count: 0,
          error: null,
        }),
  ]);

  logSupabaseError("Error contando profesores:", teachersError);

  logSupabaseError("Error contando materias:", subjectsError);

  logSupabaseError("Error contando grupos:", groupsError);

  logSupabaseError("Error contando horarios:", schedulesError);

  let recentVersions = [];

  if (activeAcademicPeriod) {
    const { data, error } = await supabase
      .from("schedule_versions")
      .select(
        `
        id,
        name,
        status,
        solver_status,
        objective_value,
        created_at,
        schedule_entries (
          id
        )
      `,
      )
      .eq("school_id", school.id)
      .eq("academic_period_id", activeAcademicPeriod.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(3);

    logSupabaseError("Error obteniendo horarios recientes:", error);

    recentVersions = data ?? [];
  }

  const dashboardStats = [
    {
      title: "Profesores",
      value: teachersCount ?? 0,
      description: "Profesores activos registrados",
      icon: Users,
      href: "/profesores",
    },
    {
      title: "Materias",
      value: subjectsCount ?? 0,
      description: "Materias activas configuradas",
      icon: BookOpen,
      href: "/materias",
    },
    {
      title: "Grupos",
      value: groupsCount ?? 0,
      description: activeAcademicPeriod
        ? "Grupos del ciclo activo"
        : "Configura un ciclo escolar",
      icon: GraduationCap,
      href: "/grupos",
    },
    {
      title: "Horarios",
      value: schedulesCount ?? 0,
      description: activeAcademicPeriod
        ? "Versiones del ciclo activo"
        : "Sin ciclo escolar activo",
      icon: CalendarClock,
      href: "/horarios",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-sm">
              Panel principal
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Administración escolar
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Administra la información académica de{" "}
              <span className="font-semibold text-white">{school.name}</span>.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 p-4 lg:w-auto lg:min-w-72">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/10 p-2.5">
                <CalendarDays size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Ciclo escolar activo
                </p>

                <p className="mt-1 truncate font-bold text-white">
                  {activeAcademicPeriod?.name || "Sin configurar"}
                </p>

                {!activeAcademicPeriod && (
                  <Link
                    href="/configuracion/ciclos"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:text-sky-200"
                  >
                    Configurar ciclo
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-950">
                Horarios recientes
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Últimas versiones del ciclo escolar activo.
              </p>
            </div>

            <Link
              href="/horarios"
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
            >
              Ver todos
              <ArrowRight size={16} />
            </Link>
          </div>

          {!activeAcademicPeriod ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center sm:p-10">
              <CalendarDays className="mx-auto text-slate-400" size={34} />

              <h4 className="mt-4 font-bold text-slate-900">
                No hay ciclo escolar activo
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Configura un ciclo escolar antes de crear grupos y generar
                horarios.
              </p>

              <Link
                href="/configuracion/ciclos"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Configurar ciclo
                <Settings size={16} />
              </Link>
            </div>
          ) : recentVersions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center sm:p-10">
              <CalendarClock className="mx-auto text-slate-400" size={34} />

              <h4 className="mt-4 font-bold text-slate-900">
                No hay horarios generados
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Cuando generes el primer horario aparecerá aquí.
              </p>

              <Link
                href="/generador"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir al generador
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentVersions.map((version) => {
                const status =
                  versionStatusConfiguration[version.status] ??
                  versionStatusConfiguration.draft;

                const entriesCount = version.schedule_entries?.length ?? 0;

                return (
                  <Link
                    key={version.id}
                    href={`/horarios/${version.id}`}
                    className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate font-bold text-slate-950">
                          {version.name || "Horario sin nombre"}
                        </h4>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>

                        {version.solver_status && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={12} />

                            {solverStatusLabels[version.solver_status] ||
                              version.solver_status}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {entriesCount} clases · {formatDate(version.created_at)}
                      </p>
                    </div>

                    <ChevronRight
                      className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700"
                      size={21}
                    />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-slate-950">
              Acciones principales
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Accede rápidamente a los módulos más utilizados.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="shrink-0 rounded-xl bg-slate-100 p-3 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white">
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900">{action.title}</h4>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {action.description}
                    </p>
                  </div>

                  <ArrowRight
                    size={17}
                    className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-800"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
