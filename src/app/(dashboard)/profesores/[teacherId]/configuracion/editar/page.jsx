import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  UserRoundPen,
} from "lucide-react";
import TeacherEditForm from "./TeacherEditForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";

export const metadata = {
  title: "Editar profesor",
};

export const dynamic = "force-dynamic";

export default async function EditTeacherPage({
  params,
}) {
  const { teacherId } = await params;

  const { school } =
    await getCurrentSchool();

  const supabase =
    await createClient();

  const {
    data: teacher,
    error,
  } = await supabase
    .from("teachers")
    .select(`
      id,
      employee_number,
      first_name,
      last_name,
      max_weekly_periods,
      max_daily_periods,
      active
    `)
    .eq("id", teacherId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Error obteniendo profesor:",
      error,
    );
  }

  if (!teacher) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
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
            <UserRoundPen size={24} />
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Profesores
            </p>

            <h2 className="mt-1 text-3xl font-bold text-slate-950">
              Editar profesor
            </h2>

            <p className="mt-2 text-slate-600">
              Corrige la información general y los límites
              de horas del profesor.
            </p>
          </div>
        </div>
      </section>

      <TeacherEditForm
        teacher={teacher}
      />
    </div>
  );
}