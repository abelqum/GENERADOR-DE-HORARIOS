import Link from "next/link";
import { CalendarRange, Clock3, GraduationCap, School } from "lucide-react";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";
import SchoolSettingsForm from "@/components/school/SchoolSettingsForm";
export const metadata = {
  title: "Configuración",
};

export const dynamic = "force-dynamic";

const modules = [
  {
    title: "Ciclos escolares",
    description: "Administra las horas y selecciona el ciclo activo.",
    href: "/configuracion/ciclos",
    icon: CalendarRange,
  },
  {
    title: "Turnos",
    description: "Configura los turnos matutino, vespertino u otros.",
    href: "/configuracion/turnos",
    icon: Clock3,
  },
  {
    title: "Horas",
    description: "Define los horarios de clases y recesos de cada turno.",
    href: "/configuracion/periodos",
    icon: School,
  },
  {
    title: "Grados",
    description: "Configura primero, segundo, tercero y otros niveles.",
    href: "/configuracion/grados",
    icon: GraduationCap,
  },
];

export default async function ConfigurationPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: activeAcademicPeriod } = await supabase
    .from("academic_periods")
    .select("id, name, start_date, end_date")
    .eq("school_id", school.id)
    .eq("active", true)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Administración
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Configuración escolar
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Configura la estructura académica necesaria antes de registrar grupos
          y profesores.
        </p>
      </section>
      <div className="space-y-4">
        <SchoolSettingsForm school={school} />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ciclo escolar activo
          </p>

          <p className="mt-1 font-semibold text-slate-900">
            {activeAcademicPeriod?.name || "Todavía no se ha configurado"}
          </p>
        </section>
      </div>
      <section className="grid gap-4 sm:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="inline-flex rounded-xl bg-slate-100 p-3 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white">
                <Icon size={22} />
              </div>

              <h3 className="mt-5 font-bold text-slate-950">{module.title}</h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {module.description}
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
