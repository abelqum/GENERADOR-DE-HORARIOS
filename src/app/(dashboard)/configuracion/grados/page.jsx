import GradeLevelForm from "@/components/configuration/GradeLevelForm";
import GradeLevelsTable from "@/components/configuration/GradeLevelsTable";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Grados",
};

export const dynamic = "force-dynamic";

export default async function GradeLevelsPage() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: gradeLevels, error } = await supabase
    .from("grade_levels")
    .select(`
      id,
      name,
      order_number,
      active,
      groups (
        id
      )
    `)
    .eq("school_id", school.id)
    .order("order_number", {
      ascending: true,
    });

  if (error) {
    console.error("Error obteniendo grados:", error);
  }

  const normalizedGradeLevels = (gradeLevels ?? []).map(
    (gradeLevel) => ({
      ...gradeLevel,
      groupsCount: gradeLevel.groups?.length ?? 0,
    }),
  );

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Configuración escolar
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Grados escolares
        </h2>

        <p className="mt-2 max-w-3xl text-slate-600">
          Registra los niveles escolares disponibles para crear
          los grupos.
        </p>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[420px_1fr]">
        <GradeLevelForm />

        <GradeLevelsTable
          gradeLevels={normalizedGradeLevels}
        />
      </div>
    </div>
  );
}