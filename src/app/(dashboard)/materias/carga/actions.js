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

export async function saveCurriculumRequirementAction(
  _previousState,
  formData,
) {
  const subjectId = getString(formData, "subjectId");
  const gradeLevelId = getString(formData, "gradeLevelId");

  const weeklyPeriods = getPositiveInteger(formData, "weeklyPeriods");

  const maxPeriodsPerDay = getPositiveInteger(formData, "maxPeriodsPerDay");

  const minDaysPerWeek = getPositiveInteger(formData, "minDaysPerWeek");

  const preferredBlockSize = getPositiveInteger(formData, "preferredBlockSize");

  const allowConsecutivePeriods =
    formData.get("allowConsecutivePeriods") === "on";

  if (!subjectId) {
    return {
      success: false,
      message: "Selecciona una materia.",
    };
  }

  if (!gradeLevelId) {
    return {
      success: false,
      message: "Selecciona un grado.",
    };
  }

  if (!weeklyPeriods) {
    return {
      success: false,
      message: "Las horas semanales deben ser mayores que cero.",
    };
  }

  if (!maxPeriodsPerDay) {
    return {
      success: false,
      message: "El máximo diario debe ser mayor que cero.",
    };
  }

  if (!minDaysPerWeek || minDaysPerWeek < 1 || minDaysPerWeek > 7) {
    return {
      success: false,
      message: "El mínimo de días debe estar entre 1 y 7.",
    };
  }

  if (minDaysPerWeek > weeklyPeriods) {
    return {
      success: false,
      message: "El mínimo de días no puede superar las horas semanales.",
    };
  }

  if (maxPeriodsPerDay > weeklyPeriods) {
    return {
      success: false,
      message: "El máximo diario no puede superar la carga semanal.",
    };
  }

  if (!preferredBlockSize) {
    return {
      success: false,
      message: "El tamaño del bloque debe ser mayor que cero.",
    };
  }

  if (!allowConsecutivePeriods && preferredBlockSize > 1) {
    return {
      success: false,
      message:
        "Activa las clases consecutivas para usar bloques mayores a uno.",
    };
  }

  if (preferredBlockSize > maxPeriodsPerDay) {
    return {
      success: false,
      message: "El bloque preferido no puede superar el máximo diario.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: activeAcademicPeriod, error: periodError } = await supabase
    .from("academic_periods")
    .select("id")
    .eq("school_id", school.id)
    .eq("active", true)
    .maybeSingle();

  if (periodError) {
    console.error("Error obteniendo ciclo escolar activo:", periodError);

    return {
      success: false,
      message: "No fue posible obtener el ciclo escolar activo.",
    };
  }

  if (!activeAcademicPeriod) {
    return {
      success: false,
      message: "Primero debes configurar un ciclo escolar activo.",
    };
  }

  const [
    { data: subject, error: subjectError },
    { data: gradeLevel, error: gradeError },
  ] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, active")
      .eq("id", subjectId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("grade_levels")
      .select("id, active")
      .eq("id", gradeLevelId)
      .eq("school_id", school.id)
      .maybeSingle(),
  ]);

  if (subjectError || !subject?.active) {
    return {
      success: false,
      message: "La materia seleccionada no está disponible.",
    };
  }

  if (gradeError || !gradeLevel?.active) {
    return {
      success: false,
      message: "El grado seleccionado no está disponible.",
    };
  }

  const { error } = await supabase.from("curriculum_requirements").upsert(
    {
      school_id: school.id,
      academic_period_id: activeAcademicPeriod.id,
      grade_level_id: gradeLevelId,
      subject_id: subjectId,
      weekly_periods: weeklyPeriods,
      max_periods_per_day: maxPeriodsPerDay,
      min_days_per_week: minDaysPerWeek,
      allow_consecutive_periods: allowConsecutivePeriods,
      preferred_block_size: preferredBlockSize,
    },
    {
      onConflict: "academic_period_id,grade_level_id,subject_id",
    },
  );

  if (error) {
    console.error("Error guardando carga curricular:", error);

    return {
      success: false,
      message: "No fue posible guardar la carga curricular.",
    };
  }

  revalidatePath("/materias");
  revalidatePath("/materias/carga");
  revalidatePath("/asignaciones");

  return {
    success: true,
    message: "Carga curricular guardada correctamente.",
  };
}
export async function updateCurriculumRequirementAction(formData) {
  const requirementId = getString(formData, "requirementId");

  const weeklyPeriods = getPositiveInteger(formData, "weeklyPeriods");

  const maxPeriodsPerDay = getPositiveInteger(formData, "maxPeriodsPerDay");

  const minDaysPerWeek = getPositiveInteger(formData, "minDaysPerWeek");

  const preferredBlockSize = getPositiveInteger(formData, "preferredBlockSize");

  const allowConsecutivePeriods =
    getString(formData, "allowConsecutivePeriods") === "true";

  if (!requirementId) {
    return {
      success: false,
      message: "No fue posible identificar la carga curricular.",
    };
  }

  if (!weeklyPeriods) {
    return {
      success: false,
      message: "Las horas semanales deben ser mayores que cero.",
    };
  }

  if (!maxPeriodsPerDay) {
    return {
      success: false,
      message: "El máximo diario debe ser mayor que cero.",
    };
  }

  if (!minDaysPerWeek || minDaysPerWeek < 1 || minDaysPerWeek > 7) {
    return {
      success: false,
      message: "El mínimo de días debe estar entre 1 y 7.",
    };
  }

  if (minDaysPerWeek > weeklyPeriods) {
    return {
      success: false,
      message: "El mínimo de días no puede superar las horas semanales.",
    };
  }

  if (maxPeriodsPerDay > weeklyPeriods) {
    return {
      success: false,
      message: "El máximo diario no puede superar las horas semanales.",
    };
  }

  if (!preferredBlockSize) {
    return {
      success: false,
      message: "El tamaño del bloque debe ser mayor que cero.",
    };
  }

  if (!allowConsecutivePeriods && preferredBlockSize > 1) {
    return {
      success: false,
      message:
        "Debes permitir horas consecutivas para usar bloques mayores a uno.",
    };
  }

  if (preferredBlockSize > maxPeriodsPerDay) {
    return {
      success: false,
      message: "El bloque preferido no puede superar el máximo diario.",
    };
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: requirement, error: requirementError } = await supabase
    .from("curriculum_requirements")
    .select(
      `
      id,
      academic_period_id,
      grade_level_id,
      subject_id
    `,
    )
    .eq("id", requirementId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (requirementError) {
    console.error("Error consultando carga curricular:", requirementError);

    return {
      success: false,
      message: "No fue posible consultar la carga curricular.",
    };
  }

  if (!requirement) {
    return {
      success: false,
      message: "La carga curricular no existe o no pertenece a esta escuela.",
    };
  }

  const { error } = await supabase
    .from("curriculum_requirements")
    .update({
      weekly_periods: weeklyPeriods,
      max_periods_per_day: maxPeriodsPerDay,
      min_days_per_week: minDaysPerWeek,
      allow_consecutive_periods: allowConsecutivePeriods,
      preferred_block_size: preferredBlockSize,
    })
    .eq("id", requirementId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error actualizando carga curricular:", error);

    return {
      success: false,
      message: "No fue posible actualizar la carga curricular.",
    };
  }

  revalidatePath("/materias");
  revalidatePath("/materias/carga");
  revalidatePath("/asignaciones");
  revalidatePath("/generador");

  return {
    success: true,
    message: "Carga curricular actualizada correctamente.",
  };
}
export async function deleteCurriculumRequirementAction(formData) {
  const requirementId = getString(formData, "requirementId");

  if (!requirementId) {
    return {
      success: false,
      message: "No fue posible identificar la carga curricular.",
    };
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: requirement, error: requirementError } = await supabase
    .from("curriculum_requirements")
    .select(
      `
      id,
      academic_period_id,
      grade_level_id,
      subject_id
    `,
    )
    .eq("id", requirementId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (requirementError || !requirement) {
    console.error("Error consultando carga:", requirementError);

    return {
      success: false,
      message: "La carga curricular no existe.",
    };
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("teaching_assignments")
    .select("id")
    .eq("school_id", school.id)
    .eq("academic_period_id", requirement.academic_period_id)
    .eq("grade_level_id", requirement.grade_level_id)
    .eq("subject_id", requirement.subject_id);

  if (assignmentsError) {
    console.error("Error consultando asignaciones:", assignmentsError);

    return {
      success: false,
      message: "No fue posible consultar las asignaciones relacionadas.",
    };
  }

  const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);

  if (assignmentIds.length > 0) {
    const { error: entriesDeleteError } = await supabase
      .from("schedule_entries")
      .delete()
      .eq("school_id", school.id)
      .in("teaching_assignment_id", assignmentIds);

    if (entriesDeleteError) {
      console.error(
        "Error eliminando clases relacionadas:",
        entriesDeleteError,
      );

      return {
        success: false,
        message:
          "No fue posible eliminar las clases relacionadas con la carga.",
      };
    }

    const { error: assignmentsDeleteError } = await supabase
      .from("teaching_assignments")
      .delete()
      .eq("school_id", school.id)
      .in("id", assignmentIds);

    if (assignmentsDeleteError) {
      console.error("Error eliminando asignaciones:", assignmentsDeleteError);

      return {
        success: false,
        message: "No fue posible eliminar las asignaciones relacionadas.",
      };
    }
  }

  const { error } = await supabase
    .from("curriculum_requirements")
    .delete()
    .eq("id", requirementId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error eliminando carga curricular:", error);

    return {
      success: false,
      message: "No fue posible eliminar la carga curricular.",
    };
  }

  revalidatePath("/materias");
  revalidatePath("/materias/carga");
  revalidatePath("/asignaciones");
  revalidatePath("/generador");
  revalidatePath("/horarios");

  return {
    success: true,
    message: "Carga curricular eliminada correctamente.",
  };
}
