"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getValue(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function validateSchoolName(name) {
  if (name.length < 3) {
    return {
      success: false,
      message: "Escribe el nombre completo de la escuela.",
    };
  }

  return null;
}

export async function createSchoolAction(_previousState, formData) {
  const name = getValue(formData, "name");
  const code = getValue(formData, "code");
  const email = getValue(formData, "email");
  const phone = getValue(formData, "phone");
  const address = getValue(formData, "address");

  const validationError = validateSchoolName(name);

  if (validationError) {
    return validationError;
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      message: "Tu sesión no es válida. Inicia sesión nuevamente.",
    };
  }

  const { data: existingMembership, error: membershipError } = await supabase
    .from("school_members")
    .select("school_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("Error verificando la escuela del usuario:", membershipError);

    return {
      success: false,
      message: "No fue posible verificar la configuración actual.",
    };
  }

  if (existingMembership) {
    redirect("/");
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .insert({
      owner_user_id: user.id,
      name,
      code: code || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      timezone: "America/Mexico_City",
      active: true,
    })
    .select("id")
    .single();

  if (schoolError || !school) {
    console.error("Error creando escuela:", schoolError);

    if (schoolError?.code === "23505") {
      return {
        success: false,
        message: "Ya existe una escuela con ese código.",
      };
    }

    return {
      success: false,
      message: "No fue posible registrar la escuela.",
    };
  }

  /*
   * Se crea explícitamente la relación del usuario con la escuela.
   * No dependemos de que exista un trigger en Supabase.
   */
  const { error: membershipInsertError } = await supabase
    .from("school_members")
    .insert({
      school_id: school.id,
      user_id: user.id,
      role: "admin",
    });

  if (membershipInsertError) {
    console.error("Error creando membresía de escuela:", membershipInsertError);

    /*
     * Intentamos eliminar la escuela incompleta para no dejar
     * información huérfana.
     */
    await supabase.from("schools").delete().eq("id", school.id);

    return {
      success: false,
      message:
        "La escuela fue creada, pero no fue posible asociarla con tu cuenta.",
    };
  }

  revalidatePath("/", "layout");

  redirect("/");
}
