"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

function getValue(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function validateSchoolData({ name, email }) {
  if (name.length < 3) {
    return {
      success: false,
      message: "Escribe el nombre completo de la escuela.",
    };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      success: false,
      message: "El correo institucional no tiene un formato válido.",
    };
  }

  return null;
}

function revalidateSchoolPages() {
  revalidatePath("/");
  revalidatePath("/configuracion");
  revalidatePath("/", "layout");
}

/**
 * Crea la escuela inicial y la relaciona
 * con el usuario autenticado.
 */
export async function createSchoolAction(_previousState, formData) {
  const name = getValue(formData, "name");

  const code = getValue(formData, "code");

  const email = getValue(formData, "email");

  const phone = getValue(formData, "phone");

  const address = getValue(formData, "address");

  const validationError = validateSchoolData({
    name,
    email,
  });

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
     * Limpieza compensatoria:
     * elimina la escuela si no fue posible
     * asociarla al usuario.
     */
    await supabase.from("schools").delete().eq("id", school.id);

    return {
      success: false,
      message:
        "La escuela fue creada, pero no fue posible asociarla con tu cuenta.",
    };
  }

  revalidateSchoolPages();

  redirect("/");
}

/**
 * Actualiza la información de la escuela
 * asociada con el usuario autenticado.
 */
export async function updateSchoolAction(formData) {
  const name = getValue(formData, "name");

  const code = getValue(formData, "code");

  const email = getValue(formData, "email");

  const phone = getValue(formData, "phone");

  const address = getValue(formData, "address");

  const validationError = validateSchoolData({
    name,
    email,
  });

  if (validationError) {
    return validationError;
  }

  /*
   * getCurrentSchool verifica:
   * - sesión válida
   * - membresía existente
   * - escuela asociada
   */
  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: updatedSchool, error } = await supabase
    .from("schools")
    .update({
      name,
      code: code || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
    })
    .eq("id", school.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Error actualizando escuela:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message: "Ya existe otra escuela con ese código.",
      };
    }

    return {
      success: false,
      message: "No fue posible actualizar la escuela.",
    };
  }

  if (!updatedSchool) {
    return {
      success: false,
      message:
        "La escuela no pudo actualizarse. Revisa los permisos de Supabase.",
    };
  }

  revalidateSchoolPages();

  return {
    success: true,
    message: "Información de la escuela actualizada correctamente.",
  };
}
