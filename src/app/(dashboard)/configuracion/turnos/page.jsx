import ShiftForm from "@/components/configuration/ShiftForm";
import ShiftsTable from "@/components/configuration/ShiftsTable";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Turnos",
};

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: shifts, error } = await supabase
    .from("shifts")
    .select(`
      id,
      name,
      start_time,
      end_time,
      active,
      shift_periods (
        id
      )
    `)
    .eq("school_id", school.id)
    .order("start_time", {
      ascending: true,
    });

  if (error) {
    console.error("Error obteniendo turnos:", error);
  }

  const normalizedShifts = (shifts ?? []).map((shift) => ({
    ...shift,
    periodsCount: shift.shift_periods?.length ?? 0,
  }));

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Configuración escolar
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Turnos
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Configura los horarios generales en los que opera la
          escuela.
        </p>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <ShiftForm />

        <ShiftsTable shifts={normalizedShifts} />
      </div>
    </div>
  );
}