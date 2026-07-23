import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import TeacherSubjectForm from "@/components/teachers/TeacherSubjectForm";
import TeacherShiftForm from "@/components/teachers/TeacherShiftForm";
import TeacherConfigurationSummary from "@/components/teachers/TeacherConfigurationSummary";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Configurar profesor",
};

export const dynamic = "force-dynamic";

export default async function TeacherConfigurationPage({ params }) {
  const { teacherId } = await params;

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { data: teacher },
    { data: subjects },
    { data: shifts },
    { data: teacherSubjects },
    { data: teacherShifts },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select(
        `
        id,
        employee_number,
        first_name,
        last_name,
        email,
        phone,
        max_weekly_periods,
        max_daily_periods,
        active
      `,
      )
      .eq("id", teacherId)
      .eq("school_id", school.id)
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

    supabase
      .from("teacher_subjects")
      .select(
        `
        id,
        priority,
        is_primary,
        subject:subjects (
          id,
          name,
          code,
          color
        )
      `,
      )
      .eq("school_id", school.id)
      .eq("teacher_id", teacherId)
      .order("priority", {
        ascending: true,
      }),

    supabase
      .from("teacher_shifts")
      .select(
        `
        id,
        max_weekly_periods,
        shift:shifts (
          id,
          name,
          start_time,
          end_time
        )
      `,
      )
      .eq("school_id", school.id)
      .eq("teacher_id", teacherId),
  ]);

  if (!teacher) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/profesores"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft size={17} />
          Volver a profesores
        </Link>

        <div className="mt-5 flex items-start gap-4">
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <UserRound size={26} />
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Configuración docente
            </p>

            <h2 className="mt-1 text-3xl font-bold text-slate-950">
              {teacher.first_name} {teacher.last_name}
            </h2>

            <p className="mt-2 text-slate-600">
              Máximo de {teacher.max_weekly_periods} horas semanales y{" "}
              {teacher.max_daily_periods} diarios.
            </p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <TeacherSubjectForm
            teacherId={teacher.id}
            subjects={subjects ?? []}
          />

          <TeacherShiftForm
            teacherId={teacher.id}
            shifts={shifts ?? []}
            teacherMaxWeeklyPeriods={teacher.max_weekly_periods}
          />
        </div>

        <TeacherConfigurationSummary
          teacher={teacher}
          teacherSubjects={teacherSubjects ?? []}
          teacherShifts={teacherShifts ?? []}
        />
      </div>
    </div>
  );
}
