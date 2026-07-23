import AcademicPeriodForm from "@/components/configuration/AcademicPeriodForm";
import AcademicPeriodsTable from "@/components/configuration/AcademicPeriodsTable";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Ciclos escolares",
};

export const dynamic = "force-dynamic";

export default async function AcademicPeriodsPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: academicPeriods, error } = await supabase
    .from("academic_periods")
    .select(`
      id,
      name,
      start_date,
      end_date,
      active,
      created_at
    `)
    .eq("school_id", school.id)
    .order("start_date", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error obteniendo ciclos escolares:",
      error,
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Configuración escolar
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Ciclos escolares
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Configura las horas de la escuela y
          selecciona cuál se encuentra activa.
        </p>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <AcademicPeriodForm />

        <AcademicPeriodsTable
          academicPeriods={academicPeriods ?? []}
        />
      </div>
    </div>
  );
}