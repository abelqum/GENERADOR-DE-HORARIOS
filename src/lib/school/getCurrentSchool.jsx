import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const getCurrentSchool = cache(async () => {
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
    .select(
      `
        role,

        school:schools (
          id,
          name,
          director_name,
          code,
          address,
          phone,
          email,
          timezone,
          active
        )
      `,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("Error obteniendo la escuela del usuario:", membershipError);

    throw new Error("No fue posible obtener la escuela actual.");
  }

  if (!membership?.school) {
    redirect("/configuracion/inicial");
  }

  return {
    user,

    role: membership.role,

    school: membership.school,
  };
});
