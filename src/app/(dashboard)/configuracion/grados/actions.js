"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function getPositiveInteger(formData, field) {
  const value = Number.parseInt(getString(formData, field), 10);

  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function createGradeLevelAction(
  _previousState,
  formData,
) {
  const name = getString(formData, "name");
  const orderNumber = getPositiveInteger(
    formData,
    "orderNumber",
  );

  if (name.length < 2) {
    return {
      success: false,
      message: "El nombre del grado es obligatorio.",
    };
  }

  if (!orderNumber) {
    return {
      success: false,
      message: "El orden debe ser un número mayor que cero.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("grade_levels")
    .insert({
      school_id: school.id,
      name,
      order_number: orderNumber,
      active: true,
    });

  if (error) {
    console.error("Error creando grado:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message:
          "Ya existe un grado con ese nombre o número de orden.",
      };
    }

    return {
      success: false,
      message: "No fue posible registrar el grado.",
    };
  }

  revalidatePath("/configuracion");
  revalidatePath("/configuracion/grados");
  revalidatePath("/grupos");

  return {
    success: true,
    message: "Grado registrado correctamente.",
  };
}

export async function toggleGradeLevelAction(formData) {
  const gradeLevelId = getString(formData, "gradeLevelId");
  const nextActive =
    getString(formData, "nextActive") === "true";

  if (!gradeLevelId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("grade_levels")
    .update({
      active: nextActive,
    })
    .eq("id", gradeLevelId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error actualizando grado:", error);
    return;
  }

  revalidatePath("/configuracion/grados");
  revalidatePath("/grupos");
}

export async function deleteGradeLevelAction(formData) {
  const gradeLevelId = getString(formData, "gradeLevelId");

  if (!gradeLevelId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("groups")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("school_id", school.id)
    .eq("grade_level_id", gradeLevelId);

  if (countError) {
    console.error(
      "Error verificando grupos del grado:",
      countError,
    );

    return;
  }

  if ((count ?? 0) > 0) {
    console.error(
      "No se puede eliminar un grado con grupos asociados.",
    );

    return;
  }

  const { error } = await supabase
    .from("grade_levels")
    .delete()
    .eq("id", gradeLevelId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error eliminando grado:", error);
    return;
  }

  revalidatePath("/configuracion");
  revalidatePath("/configuracion/grados");
  revalidatePath("/grupos");
}