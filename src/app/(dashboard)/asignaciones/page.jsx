import TeachingAssignmentForm from "@/components/assignments/TeachingAssignmentForm";
import TeachingAssignmentsTable from "@/components/assignments/TeachingAssignmentsTable";
import TeacherWorkloadSummary from "@/components/assignments/TeacherWorkloadSummary";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Asignaciones docentes",
};

export const dynamic = "force-dynamic";

export default async function TeachingAssignmentsPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { data: activeAcademicPeriod, error: academicPeriodError },
    { data: groups, error: groupsError },
    { data: subjects, error: subjectsError },
    { data: teachers, error: teachersError },
  ] = await Promise.all([
    supabase
      .from("academic_periods")
      .select("id, name")
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle(),

    supabase
      .from("groups")
      .select(`
        id,
        name,
        grade_level_id,
        shift_id,
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
      .eq("active", true)
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("subjects")
      .select("id, name, code, color")
      .eq("school_id", school.id)
      .eq("active", true)
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("teachers")
      .select(`
        id,
        employee_number,
        first_name,
        last_name,
        max_weekly_periods
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
      "Error obteniendo ciclo activo:",
      academicPeriodError,
    );
  }

  if (groupsError) {
    console.error("Error obteniendo grupos:", groupsError);
  }

  if (subjectsError) {
    console.error(
      "Error obteniendo materias:",
      subjectsError,
    );
  }

  if (teachersError) {
    console.error(
      "Error obteniendo profesores:",
      teachersError,
    );
  }

  let assignments = [];

  if (activeAcademicPeriod) {
    const { data, error } = await supabase
      .from("teaching_assignments")
      .select(`
        id,
        weekly_periods,
        max_periods_per_day,
        min_days_per_week,
        allow_consecutive_periods,
        preferred_block_size,
        locked,
        group:groups (
          id,
          name,
          grade_level:grade_levels (
            id,
            name,
            order_number
          ),
          shift:shifts (
            id,
            name
          )
        ),
        subject:subjects (
          id,
          name,
          code,
          color
        ),
        teacher:teachers (
          id,
          employee_number,
          first_name,
          last_name,
          max_weekly_periods
        )
      `)
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      );

    if (error) {
      console.error(
        "Error obteniendo asignaciones docentes:",
        error,
      );
    }

    assignments = (data ?? []).sort((first, second) => {
      const firstGroup =
        first.group?.name ?? "";

      const secondGroup =
        second.group?.name ?? "";

      const groupComparison = firstGroup.localeCompare(
        secondGroup,
        "es",
        {
          numeric: true,
        },
      );

      if (groupComparison !== 0) {
        return groupComparison;
      }

      return String(first.subject?.name ?? "").localeCompare(
        String(second.subject?.name ?? ""),
        "es",
      );
    });
  }

  const teacherWorkloads = (teachers ?? []).map((teacher) => {
    const assignedPeriods = assignments
      .filter(
        (assignment) =>
          assignment.teacher?.id === teacher.id,
      )
      .reduce(
        (total, assignment) =>
          total + assignment.weekly_periods,
        0,
      );

    return {
      teacherId: teacher.id,
      teacherName: `${teacher.first_name} ${teacher.last_name}`,
      assignedPeriods,
      maxWeeklyPeriods: teacher.max_weekly_periods,
    };
  });

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Organización académica
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Asignaciones docentes
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Relaciona cada materia y grupo con el profesor que la
          impartirá durante el ciclo escolar activo.
        </p>
      </section>

      <TeacherWorkloadSummary
        workloads={teacherWorkloads}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <TeachingAssignmentForm
          activeAcademicPeriod={activeAcademicPeriod}
          groups={groups ?? []}
          subjects={subjects ?? []}
          teachers={teachers ?? []}
        />

      <TeachingAssignmentsTable
  assignments={assignments}
  teachers={teachers ?? []}
/>
      </div>
    </div>
  );
}