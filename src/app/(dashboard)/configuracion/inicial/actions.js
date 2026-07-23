"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
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
    console.error("Error verificando escuela:", membershipError);

    return {
      success: false,
      message: "No fue posible verificar la configuración actual.",
    };
  }

  if (existingMembership) {
    redirect("/");
  }

  const { error: insertError } = await supabase.from("schools").insert({
    owner_user_id: user.id,
    name,
    code: code || null,
    email: email || null,
    phone: phone || null,
    address: address || null,
    timezone: "America/Mexico_City",
  });

  if (insertError) {
    console.error("Error creando escuela:", insertError);

    if (insertError.code === "23505") {
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

  revalidatePath("/", "layout");

  redirect("/");
}

export async function updateSchoolAction(formData) {
  const name = getValue(formData, "name");

  const code = getValue(formData, "code");

  const email = getValue(formData, "email");

  const phone = getValue(formData, "phone");

  const address = getValue(formData, "address");

  const validationError = validateSchoolName(name);

  if (validationError) {
    return validationError;
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { error } = await supabase
    .from("schools")
    .update({
      name,
      code: code || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
    })
    .eq("id", school.id);

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

  revalidatePath("/configuracion");

  revalidatePath("/", "layout");

  return {
    success: true,
    message: "Información de la escuela actualizada correctamente.",
  };
}
