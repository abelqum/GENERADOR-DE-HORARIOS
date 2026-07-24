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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("school_members")
    .select("school_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("Error verificando la escuela del usuario:", membershipError);
  }

  if (membership) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Primer paso
          </p>

          <h1 className="mt-2 text-3xl font-bold">Registra la escuela</h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Esta información identificará los profesores, grupos, materias y
            horarios del sistema.
          </p>
        </section>

        <InitialSchoolForm />
      </div>
    </main>
  );
}
