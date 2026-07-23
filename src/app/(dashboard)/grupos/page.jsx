import GroupForm from "@/components/groups/GroupForm";
import GroupsTable from "@/components/groups/GroupsTable";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Grupos",
};

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { data: activeAcademicPeriod, error: periodError },
    { data: gradeLevels, error: gradeLevelsError },
    { data: shifts, error: shiftsError },
  ] = await Promise.all([
    supabase
      .from("academic_periods")
      .select("id, name")
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle(),

    supabase
      .from("grade_levels")
      .select("id, name, order_number")
      .eq("school_id", school.id)
      .eq("active", true)
      .order("order_number", {
        ascending: true,
      }),

    supabase
      .from("shifts")
      .select("id, name, start_time, end_time")
      .eq("school_id", school.id)
      .eq("active", true)
      .order("start_time", {
        ascending: true,
      }),
  ]);

  if (periodError) {
    console.error("Error obteniendo ciclo activo:", periodError);
  }

  if (gradeLevelsError) {
    console.error(
      "Error obteniendo grados:",
      gradeLevelsError,
    );
  }

  if (shiftsError) {
    console.error("Error obteniendo turnos:", shiftsError);
  }

  let groups = [];

  if (activeAcademicPeriod) {
   const { data, error } = await supabase
  .from("groups")
  .select(`
    id,
    name,
    grade_level_id,
    shift_id,
    student_count,
    active,
    grade_level:grade_levels (
      id,
      name,
      order_number
    ),
    shift:shifts (
      id,
      name,
      start_time,
      end_time
    )
  `)
  .eq("school_id", school.id)
  .eq(
    "academic_period_id",
    activeAcademicPeriod.id,
  )
  .order("name", {
    ascending: true,
  });

    if (error) {
      console.error("Error obteniendo grupos:", error);
    }

    groups = data ?? [];
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Organización escolar
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Grupos
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Registra los grupos del ciclo escolar activo y
          relaciónalos con su grado y turno.
        </p>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <GroupForm
          gradeLevels={gradeLevels ?? []}
          shifts={shifts ?? []}
          activeAcademicPeriod={activeAcademicPeriod}
        />

   <GroupsTable
  groups={groups}
  gradeLevels={gradeLevels ?? []}
  shifts={shifts ?? []}
/>
      </div>
    </div>
  );
}