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
      .select(
        `
        id,
        name,
        order_number
      `,
      )
      .eq("school_id", school.id)
      .eq("active", true)
      .order("order_number", {
        ascending: true,
      }),

    supabase
      .from("shifts")
      .select(
        `
        id,
        name,
        start_time,
        end_time
      `,
      )
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
    console.error("Error obteniendo grados:", gradeLevelsError);
  }

  if (shiftsError) {
    console.error("Error obteniendo turnos:", shiftsError);
  }

  const shiftIds = (shifts ?? []).map((shift) => shift.id);

  let shiftPeriods = [];

  if (shiftIds.length > 0) {
    const { data: shiftPeriodsData, error: shiftPeriodsError } = await supabase
      .from("shift_periods")
      .select(
        `
        id,
        shift_id,
        period_number,
        name,
        start_time,
        end_time,
        period_type,
        active
      `,
      )
      .in("shift_id", shiftIds)
      .eq("active", true)
      .order("shift_id", {
        ascending: true,
      })
      .order("period_number", {
        ascending: true,
      });

    if (shiftPeriodsError) {
      console.error("Error obteniendo horas de los turnos:", shiftPeriodsError);
    }

    shiftPeriods = shiftPeriodsData ?? [];
  }

  let groups = [];

  if (activeAcademicPeriod) {
    const [
      { data: groupsData, error: groupsError },
      { data: fixedPeriodsData, error: fixedPeriodsError },
    ] = await Promise.all([
      supabase
        .from("groups")
        .select(
          `
          id,
          name,
          academic_period_id,
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
        `,
        )
        .eq("school_id", school.id)
        .eq("academic_period_id", activeAcademicPeriod.id)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("group_fixed_periods")
        .select(
          `
          id,
          block_id,
          group_id,
          day_of_week,
          shift_period_id,
          slot_order,
          activity_type,
          label,
          color,

          period:shift_periods (
            id,
            shift_id,
            period_number,
            name,
            start_time,
            end_time,
            period_type,
            active
          )
        `,
        )
        .eq("school_id", school.id)
        .eq("academic_period_id", activeAcademicPeriod.id)
        .eq("activity_type", "workshop")
        .order("slot_order", {
          ascending: true,
        }),
    ]);

    if (groupsError) {
      console.error("Error obteniendo grupos:", groupsError);
    }

    if (fixedPeriodsError) {
      console.error("Error obteniendo talleres fijos:", fixedPeriodsError);
    }

    const fixedPeriodsByGroup = new Map();

    (fixedPeriodsData ?? []).forEach((fixedPeriod) => {
      const currentPeriods =
        fixedPeriodsByGroup.get(fixedPeriod.group_id) ?? [];

      currentPeriods.push(fixedPeriod);

      fixedPeriodsByGroup.set(fixedPeriod.group_id, currentPeriods);
    });

    groups = (groupsData ?? []).map((group) => ({
      ...group,

      fixed_workshop_periods: (fixedPeriodsByGroup.get(group.id) ?? []).sort(
        (firstPeriod, secondPeriod) =>
          firstPeriod.slot_order - secondPeriod.slot_order,
      ),
    }));
  }

  const configuredWorkshopsCount = groups.filter(
    (group) => group.fixed_workshop_periods?.length === 3,
  ).length;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Organización escolar
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">Grupos</h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Registra los grupos del ciclo escolar activo, relaciónalos con su
          grado y turno, y configura sus tres horas fijas de taller.
        </p>

        {activeAcademicPeriod && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Ciclo: {activeAcademicPeriod.name}
            </span>

            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Talleres configurados: {configuredWorkshopsCount} de{" "}
              {groups.length}
            </span>
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <GroupForm
          gradeLevels={gradeLevels ?? []}
          shifts={shifts ?? []}
          activeAcademicPeriod={activeAcademicPeriod}
        />

        <div className="min-w-0">
          <GroupsTable
            groups={groups}
            gradeLevels={gradeLevels ?? []}
            shifts={shifts ?? []}
            shiftPeriods={shiftPeriods}
          />
        </div>
      </div>
    </div>
  );
}
