import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  Users,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";

const quickActions = [
  {
    title: "Registrar profesor",
    description: "Agrega profesores y define las materias que pueden impartir.",
    href: "/profesores",
  },
  {
    title: "Registrar materias",
    description: "Configura materias y cargas semanales por grado.",
    href: "/materias",
  },
  {
    title: "Configurar grupos",
    description: "Crea grados, grupos y turnos escolares.",
    href: "/grupos",
  },
  {
    title: "Generar horario",
    description: "Construye un horario utilizando las restricciones registradas.",
    href: "/generador",
  },
];
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";
export default  async function HomePage() {
    const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: activeAcademicPeriod } = await supabase
    .from("academic_periods")
    .select("name")
    .eq("school_id", school.id)
    .eq("active", true)
    .maybeSingle();
  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Panel principal
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Administración escolar
        </h2>

       <p className="mt-2 max-w-3xl text-slate-600">
  Administra la información académica de {school.name}.
  Ciclo actual:{" "}
  <span className="font-semibold text-slate-800">
    {activeAcademicPeriod?.name || "sin configurar"}
  </span>
  .
</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Profesores"
          value="0"
          description="Profesores registrados"
          icon={Users}
        />

        <StatCard
          title="Materias"
          value="0"
          description="Materias activas"
          icon={BookOpen}
        />

        <StatCard
          title="Grupos"
          value="0"
          description="Grupos registrados"
          icon={GraduationCap}
        />

        <StatCard
          title="Horarios"
          value="0"
          description="Versiones generadas"
          icon={CalendarClock}
        />
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-900">
            Acciones principales
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Selecciona un módulo para comenzar a configurar la escuela.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <h4 className="font-bold text-slate-900">{action.title}</h4>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}