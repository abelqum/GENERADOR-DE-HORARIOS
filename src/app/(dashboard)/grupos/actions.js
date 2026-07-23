"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function getOptionalNonNegativeInteger(formData, field) {
  const rawValue = getString(formData, field);

  if (!rawValue) {
    return null;
  }

  const value = Number.parseInt(rawValue, 10);

  return Number.isInteger(value) && value >= 0
    ? value
    : Number.NaN;
}

export async function createGroupAction(
  _previousState,
  formData,
) {
  const name = getString(formData, "name").toUpperCase();
  const gradeLevelId = getString(formData, "gradeLevelId");
  const shiftId = getString(formData, "shiftId");
  const studentCount = getOptionalNonNegativeInteger(
    formData,
    "studentCount",
  );

  if (!name || name.length > 50) {
    return {
      success: false,
      message: "Escribe un nombre de grupo válido.",
    };
  }

  if (!gradeLevelId) {
    return {
      success: false,
      message: "Selecciona el grado escolar.",
    };
  }

  if (!shiftId) {
    return {
      success: false,
      message: "Selecciona el turno.",
    };
  }

  if (Number.isNaN(studentCount)) {
    return {
      success: false,
      message:
        "La cantidad de estudiantes debe ser igual o mayor que cero.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: activeAcademicPeriod, error: periodError } =
    await supabase
      .from("academic_periods")
      .select("id")
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle();

  if (periodError) {
    console.error(
      "Error obteniendo ciclo activo:",
      periodError,
    );

    return {
      success: false,
      message: "No fue posible obtener el ciclo escolar activo.",
    };
  }

  if (!activeAcademicPeriod) {
    return {
      success: false,
      message:
        "Primero debes configurar un ciclo escolar activo.",
    };
  }

  const [
    { data: gradeLevel, error: gradeError },
    { data: shift, error: shiftError },
  ] = await Promise.all([
    supabase
      .from("grade_levels")
      .select("id, active")
      .eq("id", gradeLevelId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("shifts")
      .select("id, active")
      .eq("id", shiftId)
      .eq("school_id", school.id)
      .maybeSingle(),
  ]);

  if (gradeError || !gradeLevel?.active) {
    return {
      success: false,
      message: "El grado seleccionado no está disponible.",
    };
  }

  if (shiftError || !shift?.active) {
    return {
      success: false,
      message: "El turno seleccionado no está disponible.",
    };
  }

  const { error } = await supabase.from("groups").insert({
    school_id: school.id,
    academic_period_id: activeAcademicPeriod.id,
    grade_level_id: gradeLevelId,
    shift_id: shiftId,
    name,
    student_count: studentCount,
    active: true,
  });

  if (error) {
    console.error("Error creando grupo:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message:
          "Ya existe un grupo con ese nombre en el ciclo escolar activo.",
      };
    }

    return {
      success: false,
      message: "No fue posible registrar el grupo.",
    };
  }

  revalidatePath("/grupos");
  revalidatePath("/configuracion/grados");
  revalidatePath("/");

  return {
    success: true,
    message: "Grupo registrado correctamente.",
  };
}
export async function updateGroupAction(formData) {
  const groupId = getString(formData, "groupId");

  const name = getString(
    formData,
    "name",
  ).toUpperCase();

  const gradeLevelId = getString(
    formData,
    "gradeLevelId",
  );

  const shiftId = getString(
    formData,
    "shiftId",
  );

  const studentCount =
    getOptionalNonNegativeInteger(
      formData,
      "studentCount",
    );

  const active =
    getString(formData, "active") === "true";

  if (!groupId) {
    return {
      success: false,
      message:
        "No fue posible identificar el grupo.",
    };
  }

  if (!name || name.length > 50) {
    return {
      success: false,
      message:
        "Escribe un nombre de grupo válido.",
    };
  }

  if (!gradeLevelId) {
    return {
      success: false,
      message:
        "Selecciona el grado escolar.",
    };
  }

  if (!shiftId) {
    return {
      success: false,
      message:
        "Selecciona el turno.",
    };
  }

  if (Number.isNaN(studentCount)) {
    return {
      success: false,
      message:
        "La cantidad de estudiantes debe ser igual o mayor que cero.",
    };
  }

  const { school } =
    await getCurrentSchool();

  const supabase =
    await createClient();

  const {
    data: currentGroup,
    error: currentGroupError,
  } = await supabase
    .from("groups")
    .select(`
      id,
      academic_period_id
    `)
    .eq("id", groupId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (currentGroupError) {
    console.error(
      "Error consultando grupo:",
      currentGroupError,
    );

    return {
      success: false,
      message:
        "No fue posible consultar el grupo.",
    };
  }

  if (!currentGroup) {
    return {
      success: false,
      message:
        "El grupo no existe o no pertenece a esta escuela.",
    };
  }

  const [
    {
      data: gradeLevel,
      error: gradeLevelError,
    },
    {
      data: shift,
      error: shiftError,
    },
  ] = await Promise.all([
    supabase
      .from("grade_levels")
      .select("id, active")
      .eq("id", gradeLevelId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("shifts")
      .select("id, active")
      .eq("id", shiftId)
      .eq("school_id", school.id)
      .maybeSingle(),
  ]);

  if (
    gradeLevelError ||
    !gradeLevel?.active
  ) {
    return {
      success: false,
      message:
        "El grado seleccionado no está disponible.",
    };
  }

  if (shiftError || !shift?.active) {
    return {
      success: false,
      message:
        "El turno seleccionado no está disponible.",
    };
  }

  /*
   * Evita nombres duplicados dentro del mismo ciclo.
   */
  const {
    data: duplicatedGroup,
    error: duplicatedGroupError,
  } = await supabase
    .from("groups")
    .select("id")
    .eq("school_id", school.id)
    .eq(
      "academic_period_id",
      currentGroup.academic_period_id,
    )
    .eq("name", name)
    .neq("id", groupId)
    .maybeSingle();

  if (duplicatedGroupError) {
    console.error(
      "Error verificando grupo duplicado:",
      duplicatedGroupError,
    );

    return {
      success: false,
      message:
        "No fue posible verificar el nombre del grupo.",
    };
  }

  if (duplicatedGroup) {
    return {
      success: false,
      message:
        "Ya existe otro grupo con ese nombre en el ciclo escolar actual.",
    };
  }

  const { error } = await supabase
    .from("groups")
    .update({
      name,
      grade_level_id:
        gradeLevelId,
      shift_id: shiftId,
      student_count:
        studentCount,
      active,
    })
    .eq("id", groupId)
    .eq("school_id", school.id);

  if (error) {
    console.error(
      "Error actualizando grupo:",
      error,
    );

    if (error.code === "23505") {
      return {
        success: false,
        message:
          "Ya existe otro grupo con ese nombre.",
      };
    }

    return {
      success: false,
      message:
        "No fue posible actualizar el grupo.",
    };
  }

  revalidatePath("/grupos");
  revalidatePath("/asignaciones");
  revalidatePath("/disponibilidad");
  revalidatePath("/generador");
  revalidatePath("/horarios");
  revalidatePath("/");

  return {
    success: true,
    message:
      "Grupo actualizado correctamente.",
  };
}
export async function toggleGroupAction(formData) {
  const groupId = getString(formData, "groupId");
  const nextActive =
    getString(formData, "nextActive") === "true";

  if (!groupId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("groups")
    .update({
      active: nextActive,
    })
    .eq("id", groupId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error actualizando grupo:", error);
    return;
  }

  revalidatePath("/grupos");
  revalidatePath("/configuracion/grados");
  revalidatePath("/");
}

export async function deleteGroupAction(formData) {
  const groupId = getString(formData, "groupId");

  if (!groupId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { count: assignmentsCount, error: assignmentsError },
    { count: entriesCount, error: entriesError },
  ] = await Promise.all([
    supabase
      .from("teaching_assignments")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("group_id", groupId),

    supabase
      .from("schedule_entries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("group_id", groupId),
  ]);

  if (assignmentsError || entriesError) {
    console.error(
      "Error verificando dependencias del grupo:",
      assignmentsError || entriesError,
    );

    return;
  }

  if (
    (assignmentsCount ?? 0) > 0 ||
    (entriesCount ?? 0) > 0
  ) {
    console.error(
      "No se puede eliminar un grupo que ya está en uso.",
    );

    return;
  }

  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error eliminando grupo:", error);
    return;
  }

  revalidatePath("/grupos");
  revalidatePath("/configuracion/grados");
  revalidatePath("/");
}