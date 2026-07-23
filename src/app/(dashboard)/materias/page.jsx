import Link from "next/link";
import { ClipboardList } from "lucide-react";
import SubjectForm from "@/components/subjects/SubjectForm";
import SubjectsTable from "@/components/subjects/SubjectsTable";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Materias",
};

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: subjects, error } = await supabase
    .from("subjects")
    .select(`
      id,
      name,
      code,
      color,
      active,
      curriculum_requirements (
        id
      ),
      teacher_subjects (
        id
      ),
      teaching_assignments (
        id
      )
    `)
    .eq("school_id", school.id)
    .order("name", {
      ascending: true,
    });

  if (error) {
    console.error("Error obteniendo materias:", error);
  }

  const normalizedSubjects = (subjects ?? []).map(
    (subject) => ({
      ...subject,
      curriculumCount:
        subject.curriculum_requirements?.length ?? 0,
      teacherSubjectsCount:
        subject.teacher_subjects?.length ?? 0,
      assignmentsCount:
        subject.teaching_assignments?.length ?? 0,
    }),
  );

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Plan académico
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Materias
          </h2>

          <p className="mt-2 max-w-3xl text-slate-600">
            Administra las materias disponibles y configura su
            carga por grado.
          </p>
        </div>

        <Link
          href="/materias/carga"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ClipboardList size={18} />
          Configurar carga curricular
        </Link>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <SubjectForm />

        <SubjectsTable
          subjects={normalizedSubjects}
        />
      </div>
    </div>
  );
}