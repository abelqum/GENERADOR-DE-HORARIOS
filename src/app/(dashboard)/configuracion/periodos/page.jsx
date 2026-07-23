import ShiftPeriodForm from "@/components/configuration/ShiftPeriodForm";
import ShiftPeriodsTable from "@/components/configuration/ShiftPeriodsTable";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Horas",
};

export const dynamic = "force-dynamic";

export default async function ShiftPeriodsPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { data: shifts, error: shiftsError },
    { data: periods, error: periodsError },
  ] = await Promise.all([
    supabase
      .from("shifts")
      .select(`
        id,
        name,
        start_time,
        end_time,
        active
      `)
      .eq("school_id", school.id)
      .eq("active", true)
      .order("start_time", {
        ascending: true,
      }),

   supabase
  .from("shift_periods")
  .select(`
    id,
    shift_id,
    period_number,
    name,
    start_time,
    end_time,
    period_type,
    active
  `)
  .eq("school_id", school.id)
  .order("start_time", {
    ascending: true,
  }),
  ]);

  if (shiftsError) {
    console.error("Error obteniendo turnos:", shiftsError);
  }

  if (periodsError) {
    console.error(
      "Error obteniendo horas:",
      periodsError,
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Configuración escolar
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Horas de clase y recesos
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Define las horas de clase, recesos y espacios no
  disponibles de cada turno escolar.
        </p>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <ShiftPeriodForm shifts={shifts ?? []} />

        <ShiftPeriodsTable
          shifts={shifts ?? []}
          periods={periods ?? []}
        />
      </div>
    </div>
  );
}