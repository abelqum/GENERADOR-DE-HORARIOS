"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createAdminClient } from "@/lib/supabase/admin";
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

function getDatabaseErrorMessage(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  if (error.code === "23505") {
    return "Ya existe un registro con esos datos.";
  }

  if (
    error.code === "42501" ||
    error.message?.toLowerCase().includes("row-level security")
  ) {
    return (
      "Supabase rechazó la operación por permisos. " +
      "Revisa la clave secreta configurada en el servidor."
    );
  }

  if (error.code === "42703") {
    return (
      "La estructura de la tabla no coincide con el código: " + error.message
    );
  }

  if (error.code === "23502") {
    return "Falta un dato obligatorio en la base de datos: " + error.message;
  }

  return `${fallbackMessage} Detalle: ${error.message}`;
}

function revalidateSchoolPages() {
  revalidatePath("/");
  revalidatePath("/configuracion");
  revalidatePath("/configuracion/inicial");
  revalidatePath("/", "layout");
}

/**
 * Registra la escuela inicial.
 *
 * El usuario se obtiene con el cliente SSR normal.
 * Las inserciones se realizan con el cliente administrativo
 * para evitar que RLS bloquee la configuración inicial.
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

  /*
   * Primero verificamos la sesión utilizando
   * las cookies del usuario.
   */
  const userClient = await createClient();

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    console.error("Error obteniendo usuario:", userError);

    return {
      success: false,
      message: "Tu sesión no es válida. Inicia sesión nuevamente.",
    };
  }

  let adminClient;

  try {
    adminClient = createAdminClient();
  } catch (error) {
    console.error("Error creando cliente administrativo:", error);

    return {
      success: false,
      message:
        "No está configurada correctamente la clave secreta de Supabase.",
    };
  }

  /*
   * La consulta administrativa evita que una política
   * RLS oculte una membresía existente.
   */
  const { data: existingMembership, error: membershipLookupError } =
    await adminClient
      .from("school_members")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (membershipLookupError) {
    console.error("Error verificando membresía:", membershipLookupError);

    return {
      success: false,
      message: getDatabaseErrorMessage(
        membershipLookupError,
        "No fue posible verificar la configuración actual.",
      ),
    };
  }

  if (existingMembership) {
    redirect("/");
  }

  const { data: school, error: schoolError } = await adminClient
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
        message: "Ya existe una escuela con esa clave o código.",
      };
    }

    return {
      success: false,
      message: getDatabaseErrorMessage(
        schoolError,
        "No fue posible registrar la escuela.",
      ),
    };
  }

  /*
   * Algunos proyectos tienen un trigger que crea automáticamente
   * school_members. Comprobamos antes de insertar para evitar
   * duplicados.
   */
  const {
    data: membershipCreatedByTrigger,
    error: membershipAfterSchoolError,
  } = await adminClient
    .from("school_members")
    .select("school_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipAfterSchoolError) {
    console.error(
      "Error comprobando membresía después de crear la escuela:",
      membershipAfterSchoolError,
    );

    await adminClient.from("schools").delete().eq("id", school.id);

    return {
      success: false,
      message: getDatabaseErrorMessage(
        membershipAfterSchoolError,
        "La escuela fue creada, pero no fue posible comprobar la membresía.",
      ),
    };
  }

  if (!membershipCreatedByTrigger) {
    const { error: membershipInsertError } = await adminClient
      .from("school_members")
      .insert({
        school_id: school.id,
        user_id: user.id,
        role: "admin",
      });

    if (membershipInsertError) {
      console.error("Error creando membresía:", membershipInsertError);

      /*
       * Evita dejar una escuela sin usuario asociado.
       */
      await adminClient.from("schools").delete().eq("id", school.id);

      return {
        success: false,
        message: getDatabaseErrorMessage(
          membershipInsertError,
          "La escuela fue creada, pero no fue posible asociarla con tu cuenta.",
        ),
      };
    }
  }

  revalidateSchoolPages();

  redirect("/");
}

/**
 * Edita los datos de la escuela existente.
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

  const { school } = await getCurrentSchool();

  let adminClient;

  try {
    adminClient = createAdminClient();
  } catch (error) {
    console.error("Error creando cliente administrativo:", error);

    return {
      success: false,
      message:
        "No está configurada correctamente la clave secreta de Supabase.",
    };
  }

  const { data: updatedSchool, error } = await adminClient
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
        message: "Ya existe otra escuela con esa clave o código.",
      };
    }

    return {
      success: false,
      message: getDatabaseErrorMessage(
        error,
        "No fue posible actualizar la escuela.",
      ),
    };
  }

  if (!updatedSchool) {
    return {
      success: false,
      message: "La escuela no fue encontrada o no pudo actualizarse.",
    };
  }

  revalidateSchoolPages();

  return {
    success: true,
    message: "Información de la escuela actualizada correctamente.",
  };
}
