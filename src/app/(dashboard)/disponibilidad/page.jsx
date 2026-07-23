import TeacherAvailabilitySelector from "@/components/availability/TeacherAvailabilitySelector";
import AvailabilityBulkActions from "@/components/availability/AvailabilityBulkActions";
import AvailabilityLegend from "@/components/availability/AvailabilityLegend";
import TeacherAvailabilityGrid from "@/components/availability/TeacherAvailabilityGrid";
import SelectedTeacherSummary from "@/components/availability/SelectedTeacherSummary";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Disponibilidad docente",
};

export const dynamic = "force-dynamic";

export default async function TeacherAvailabilityPage({
  searchParams,
}) {
  const resolvedSearchParams = await searchParams;

  const selectedTeacherId =
    typeof resolvedSearchParams?.teacher === "string"
      ? resolvedSearchParams.teacher
      : null;

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    {
      data: activeAcademicPeriod,
      error: academicPeriodError,
    },
    {
      data: teachers,
      error: teachersError,
    },
  ] = await Promise.all([
    supabase
      .from("academic_periods")
      .select("id, name")
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle(),

    supabase
      .from("teachers")
      .select(`
        id,
        employee_number,
        first_name,
        last_name,
        max_weekly_periods,
        max_daily_periods
      `)
      .eq("school_id", school.id)
      .eq("active", true)
      .order("last_name", {
        ascending: true,
      })
      .order("first_name", {
        ascending: true,
      }),
  ]);

  if (academicPeriodError) {
    console.error(
      "Error obteniendo ciclo escolar:",
      academicPeriodError,
    );
  }

  if (teachersError) {
    console.error(
      "Error obteniendo profesores:",
      teachersError,
    );
  }

  const selectedTeacher =
    (teachers ?? []).find(
      (teacher) =>
        teacher.id === selectedTeacherId,
    ) || null;

  let teacherShifts = [];
  let availability = [];

  if (
    selectedTeacher &&
    activeAcademicPeriod
  ) {
    const [
      {
        data: teacherShiftsData,
        error: teacherShiftsError,
      },
      {
        data: availabilityData,
        error: availabilityError,
      },
    ] = await Promise.all([
      supabase
        .from("teacher_shifts")
        .select(`
          id,
          max_weekly_periods,
          shift:shifts (
            id,
            name,
            start_time,
            end_time,
            shift_periods (
              id,
              period_number,
              name,
              start_time,
              end_time,
              period_type,
              active
            )
          )
        `)
        .eq("school_id", school.id)
        .eq(
          "teacher_id",
          selectedTeacher.id,
        ),

      supabase
        .from("teacher_availability")
        .select(`
          id,
          day_of_week,
          shift_period_id,
          availability_type,
          weight,
          notes
        `)
        .eq("school_id", school.id)
        .eq(
          "academic_period_id",
          activeAcademicPeriod.id,
        )
        .eq(
          "teacher_id",
          selectedTeacher.id,
        ),
    ]);

    if (teacherShiftsError) {
      console.error(
        "Error obteniendo turnos del profesor:",
        teacherShiftsError,
      );
    }

    if (availabilityError) {
      console.error(
        "Error obteniendo disponibilidad:",
        availabilityError,
      );
    }

    teacherShifts = (
      teacherShiftsData ?? []
    )
      .map((teacherShift) => ({
        ...teacherShift,
        shift: {
          ...teacherShift.shift,
          shift_periods: (
            teacherShift.shift
              ?.shift_periods ?? []
          ).sort(
            (first, second) =>
              first.period_number -
              second.period_number,
          ),
        },
      }))
      .sort((first, second) =>
        String(
          first.shift?.start_time ?? "",
        ).localeCompare(
          String(
            second.shift?.start_time ?? "",
          ),
        ),
      );

    availability = availabilityData ?? [];
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Preferencias docentes
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Disponibilidad semanal
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Registra los horarios disponibles y las preferencias
          de cada profesor para el ciclo escolar activo.
        </p>
      </section>

      <AvailabilityLegend />

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <TeacherAvailabilitySelector
            teachers={teachers ?? []}
            selectedTeacherId={
              selectedTeacherId
            }
          />

          <SelectedTeacherSummary
            teacher={selectedTeacher}
            teacherShifts={teacherShifts}
          />

        <AvailabilityBulkActions
  teacherId={selectedTeacher?.id}
  teacherShifts={teacherShifts}
/>
        </aside>

        <TeacherAvailabilityGrid
          teacher={selectedTeacher}
          teacherShifts={teacherShifts}
          availability={availability}
        />
      </div>
    </div>
  );
}