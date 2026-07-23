"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function normalizeCode(value) {
  const code = value.trim().toUpperCase();

  return code || null;
}

function isValidHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export async function createSubjectAction(
  _previousState,
  formData,
) {
  const name = getString(formData, "name");
  const code = normalizeCode(getString(formData, "code"));
  const color = getString(formData, "color");

  if (name.length < 2) {
    return {
      success: false,
      message: "El nombre de la materia es obligatorio.",
    };
  }

  if (code && code.length > 30) {
    return {
      success: false,
      message: "El código no puede superar 30 caracteres.",
    };
  }

  if (!isValidHexColor(color)) {
    return {
      success: false,
      message: "Selecciona un color válido.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("subjects")
    .insert({
      school_id: school.id,
      name,
      code,
      color,
      active: true,
    });

  if (error) {
    console.error("Error creando materia:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message:
          "Ya existe una materia con ese nombre o código.",
      };
    }

    return {
      success: false,
      message: "No fue posible registrar la materia.",
    };
  }

  revalidatePath("/materias");
  revalidatePath("/profesores");
  revalidatePath("/asignaciones");
  revalidatePath("/");

  return {
    success: true,
    message: "Materia registrada correctamente.",
  };
}
export async function updateSubjectAction(formData) {
  const subjectId = getString(formData, "subjectId");
  const name = getString(formData, "name");
  const code = normalizeCode(getString(formData, "code"));
  const color = getString(formData, "color");
  const active =
    getString(formData, "active") === "true";

  if (!subjectId) {
    return {
      success: false,
      message:
        "No fue posible identificar la materia.",
    };
  }

  if (name.length < 2) {
    return {
      success: false,
      message:
        "El nombre debe contener al menos dos caracteres.",
    };
  }

  if (name.length > 100) {
    return {
      success: false,
      message:
        "El nombre no puede superar 100 caracteres.",
    };
  }

  if (code && code.length > 30) {
    return {
      success: false,
      message:
        "El código no puede superar 30 caracteres.",
    };
  }

  if (!isValidHexColor(color)) {
    return {
      success: false,
      message:
        "Selecciona un color hexadecimal válido.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  /*
   * Comprobamos que la materia pertenezca a la escuela
   * antes de modificarla.
   */
  const {
    data: currentSubject,
    error: subjectError,
  } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", subjectId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (subjectError) {
    console.error(
      "Error consultando materia:",
      subjectError,
    );

    return {
      success: false,
      message:
        "No fue posible consultar la materia.",
    };
  }

  if (!currentSubject) {
    return {
      success: false,
      message:
        "La materia no existe o no pertenece a esta escuela.",
    };
  }

  /*
   * Evitamos códigos duplicados.
   */
  if (code) {
    const {
      data: duplicatedCode,
      error: duplicatedCodeError,
    } = await supabase
      .from("subjects")
      .select("id")
      .eq("school_id", school.id)
      .eq("code", code)
      .neq("id", subjectId)
      .maybeSingle();

    if (duplicatedCodeError) {
      console.error(
        "Error verificando código:",
        duplicatedCodeError,
      );

      return {
        success: false,
        message:
          "No fue posible verificar el código de la materia.",
      };
    }

    if (duplicatedCode) {
      return {
        success: false,
        message:
          "Ya existe otra materia con ese código.",
      };
    }
  }

  const { error } = await supabase
    .from("subjects")
    .update({
      name,
      code,
      color,
      active,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", subjectId)
    .eq("school_id", school.id);

  if (error) {
    console.error(
      "Error actualizando materia:",
      error,
    );

    if (error.code === "23505") {
      return {
        success: false,
        message:
          "Ya existe otra materia con ese nombre o código.",
      };
    }

    return {
      success: false,
      message:
        "No fue posible actualizar la materia.",
    };
  }

  revalidatePath("/materias");
  revalidatePath("/profesores");
  revalidatePath("/asignaciones");
  revalidatePath("/generador");
  revalidatePath("/");

  return {
    success: true,
    message:
      "Materia actualizada correctamente.",
  };
}
export async function toggleSubjectAction(formData) {
  const subjectId = getString(formData, "subjectId");
  const nextActive =
    getString(formData, "nextActive") === "true";

  if (!subjectId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("subjects")
    .update({
      active: nextActive,
    })
    .eq("id", subjectId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error actualizando materia:", error);
    return;
  }

  revalidatePath("/materias");
  revalidatePath("/profesores");
  revalidatePath("/asignaciones");
  revalidatePath("/");
}

export async function deleteSubjectAction(formData) {
  const subjectId = getString(formData, "subjectId");

  if (!subjectId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { count: curriculumCount, error: curriculumError },
    { count: teacherSubjectsCount, error: teacherSubjectsError },
    { count: assignmentsCount, error: assignmentsError },
  ] = await Promise.all([
    supabase
      .from("curriculum_requirements")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("subject_id", subjectId),

    supabase
      .from("teacher_subjects")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("subject_id", subjectId),

    supabase
      .from("teaching_assignments")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("subject_id", subjectId),
  ]);

  if (
    curriculumError ||
    teacherSubjectsError ||
    assignmentsError
  ) {
    console.error(
      "Error verificando dependencias de la materia:",
      curriculumError ||
        teacherSubjectsError ||
        assignmentsError,
    );

    return;
  }

  if (
    (curriculumCount ?? 0) > 0 ||
    (teacherSubjectsCount ?? 0) > 0 ||
    (assignmentsCount ?? 0) > 0
  ) {
    console.error(
      "No se puede eliminar una materia que está en uso.",
    );

    return;
  }

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", subjectId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error eliminando materia:", error);
    return;
  }

  revalidatePath("/materias");
  revalidatePath("/");
}