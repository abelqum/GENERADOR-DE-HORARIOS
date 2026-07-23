import CurriculumRequirementForm from "@/components/subjects/CurriculumRequirementForm";
import CurriculumRequirementsTable from "@/components/subjects/CurriculumRequirementsTable";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Carga curricular",
};

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { data: activeAcademicPeriod, error: periodError },
    { data: subjects, error: subjectsError },
    { data: gradeLevels, error: gradesError },
  ] = await Promise.all([
    supabase
      .from("academic_periods")
      .select("id, name")
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle(),

    supabase
      .from("subjects")
      .select("id, name, code, color")
      .eq("school_id", school.id)
      .eq("active", true)
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("grade_levels")
      .select("id, name, order_number")
      .eq("school_id", school.id)
      .eq("active", true)
      .order("order_number", {
        ascending: true,
      }),
  ]);

  if (periodError) {
    console.error(
      "Error obteniendo ciclo escolar:",
      periodError,
    );
  }

  if (subjectsError) {
    console.error(
      "Error obteniendo materias:",
      subjectsError,
    );
  }

  if (gradesError) {
    console.error(
      "Error obteniendo grados:",
      gradesError,
    );
  }

  let requirements = [];

  if (activeAcademicPeriod) {
    const { data, error } = await supabase
      .from("curriculum_requirements")
      .select(`
        id,
        weekly_periods,
        max_periods_per_day,
        min_days_per_week,
        allow_consecutive_periods,
        preferred_block_size,
        subject:subjects (
          id,
          name,
          code,
          color
        ),
        grade_level:grade_levels (
          id,
          name,
          order_number
        )
      `)
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      );

    if (error) {
      console.error(
        "Error obteniendo carga curricular:",
        error,
      );
    }

    requirements = (data ?? []).sort((first, second) => {
      const firstGrade =
        first.grade_level?.order_number ?? 0;

      const secondGrade =
        second.grade_level?.order_number ?? 0;

      if (firstGrade !== secondGrade) {
        return firstGrade - secondGrade;
      }

      return String(first.subject?.name ?? "").localeCompare(
        String(second.subject?.name ?? ""),
        "es",
      );
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Plan académico
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Carga curricular
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Define cuántas veces debe impartirse cada materia en
          cada grado durante la semana.
        </p>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <CurriculumRequirementForm
          subjects={subjects ?? []}
          gradeLevels={gradeLevels ?? []}
          activeAcademicPeriod={activeAcademicPeriod}
        />

        <CurriculumRequirementsTable
          requirements={requirements}
        />
      </div>
    </div>
  );
}