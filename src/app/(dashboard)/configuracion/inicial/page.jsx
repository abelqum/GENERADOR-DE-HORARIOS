import { redirect } from "next/navigation";
import InitialSchoolForm from "@/components/school/InitialSchoolForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Configuración inicial",
};

export const dynamic = "force-dynamic";

export default async function InitialConfigurationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("school_members")
    .select("school_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Primer paso
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Registra la escuela
        </h2>

        <p className="mt-2 text-slate-600">
          Esta información identificará todos los profesores, grupos,
          materias y horarios del sistema.
        </p>
      </section>

      <InitialSchoolForm />
    </div>
  );
}