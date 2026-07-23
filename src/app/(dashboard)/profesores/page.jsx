import TeacherForm from "@/components/teachers/TeacherForm";
import TeachersTable from "@/components/teachers/TeachersTable";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Profesores",
};

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: teachers, error } = await supabase
    .from("teachers")
    .select(`
      id,
      employee_number,
      first_name,
      last_name,
      email,
      phone,
      max_weekly_periods,
      max_daily_periods,
      active,
      notes,
      teacher_subjects (
        id
      ),
      teacher_shifts (
        id
      ),
      teaching_assignments (
        id
      ),
      teacher_availability (
        id
      ),
      schedule_entries (
        id
      )
    `)
    .eq("school_id", school.id)
    .order("last_name", {
      ascending: true,
    })
    .order("first_name", {
      ascending: true,
    });

  if (error) {
    console.error("Error obteniendo profesores:", error);
  }

  const normalizedTeachers = (teachers ?? []).map(
    (teacher) => ({
      ...teacher,
      subjectsCount:
        teacher.teacher_subjects?.length ?? 0,
      shiftsCount:
        teacher.teacher_shifts?.length ?? 0,
      assignmentsCount:
        teacher.teaching_assignments?.length ?? 0,
      availabilityCount:
        teacher.teacher_availability?.length ?? 0,
      entriesCount:
        teacher.schedule_entries?.length ?? 0,
    }),
  );

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Personal docente
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Profesores
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Registra profesores y configura las materias,
          turnos y cargas que pueden atender.
        </p>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <TeacherForm />

        <TeachersTable teachers={normalizedTeachers} />
      </div>
    </div>
  );
}