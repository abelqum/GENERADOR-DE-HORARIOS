"use server";

import { revalidatePath } from "next/cache";

import { SCHOOL_DAYS } from "@/constants/days";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

const SCHOOL_DAY_COUNT = SCHOOL_DAYS.length;

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function getPositiveInteger(formData, field) {
  const value = Number.parseInt(getString(formData, field), 10);

  return Number.isInteger(value) && value > 0 ? value : null;
}

function getBoolean(formData, field) {
  const value = getString(formData, field).toLowerCase();

  return value === "true" || value === "on" || value === "1";
}

function getErrorDetail(error) {
  if (!error?.message) {
    return "";
  }

  return ` Detalle: ${error.message}`;
}

function validateCurriculumRules({
  weeklyPeriods,
  maxPeriodsPerDay,
  minDaysPerWeek,
  preferredBlockSize,
  allowConsecutivePeriods,
}) {
  if (!weeklyPeriods) {
    return "Las horas semanales deben " + "ser mayores que cero.";
  }

  if (!maxPeriodsPerDay) {
    return "El máximo diario debe " + "ser mayor que cero.";
  }

  if (
    !minDaysPerWeek ||
    minDaysPerWeek < 1 ||
    minDaysPerWeek > SCHOOL_DAY_COUNT
  ) {
    return `El mínimo de días debe estar ` + `entre 1 y ${SCHOOL_DAY_COUNT}.`;
  }

  if (minDaysPerWeek > weeklyPeriods) {
    return "El mínimo de días no puede " + "superar las horas semanales.";
  }

  if (maxPeriodsPerDay > weeklyPeriods) {
    return "El máximo diario no puede " + "superar las horas semanales.";
  }

  const maximumWeeklyCapacity = maxPeriodsPerDay * SCHOOL_DAY_COUNT;

  if (weeklyPeriods > maximumWeeklyCapacity) {
    return (
      `No es posible distribuir ` +
      `${weeklyPeriods} horas en ` +
      `${SCHOOL_DAY_COUNT} días con ` +
      `un máximo de ` +
      `${maxPeriodsPerDay} horas ` +
      `por día. La capacidad máxima ` +
      `es de ` +
      `${maximumWeeklyCapacity} horas.`
    );
  }

  if (!preferredBlockSize) {
    return "El tamaño del bloque debe " + "ser mayor que cero.";
  }

  if (preferredBlockSize > weeklyPeriods) {
    return "El bloque preferido no puede " + "superar las horas semanales.";
  }

  if (!allowConsecutivePeriods && preferredBlockSize > 1) {
    return (
      "Activa las horas consecutivas " +
      "para utilizar bloques mayores " +
      "a uno."
    );
  }

  if (preferredBlockSize > maxPeriodsPerDay) {
    return "El bloque preferido no puede " + "superar el máximo diario.";
  }

  return null;
}

function revalidateCurriculumPages() {
  revalidatePath("/");
  revalidatePath("/materias");
  revalidatePath("/materias/carga");
  revalidatePath("/asignaciones");
  revalidatePath("/generador");
  revalidatePath("/horarios");
}

async function getActiveAcademicPeriod({ supabase, schoolId }) {
  return supabase
    .from("academic_periods")
    .select("id, name")
    .eq("school_id", schoolId)
    .eq("active", true)
    .maybeSingle();
}

async function validateSubjectAndGrade({
  supabase,
  schoolId,
  subjectId,
  gradeLevelId,
}) {
  const [
    { data: subject, error: subjectError },
    { data: gradeLevel, error: gradeLevelError },
  ] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, active")
      .eq("id", subjectId)
      .eq("school_id", schoolId)
      .maybeSingle(),

    supabase
      .from("grade_levels")
      .select("id, name, active")
      .eq("id", gradeLevelId)
      .eq("school_id", schoolId)
      .maybeSingle(),
  ]);

  if (subjectError) {
    console.error("Error consultando materia:", subjectError);

    return {
      success: false,
      message:
        "No fue posible consultar la materia." + getErrorDetail(subjectError),
    };
  }

  if (!subject?.active) {
    return {
      success: false,
      message: "La materia seleccionada no está disponible.",
    };
  }

  if (gradeLevelError) {
    console.error("Error consultando grado:", gradeLevelError);

    return {
      success: false,
      message:
        "No fue posible consultar el grado." + getErrorDetail(gradeLevelError),
    };
  }

  if (!gradeLevel?.active) {
    return {
      success: false,
      message: "El grado seleccionado no está disponible.",
    };
  }

  return {
    success: true,
    subject,
    gradeLevel,
  };
}

/**
 * Obtiene los grupos que pertenecen a
 * un grado dentro de un ciclo escolar.
 */
async function getRelatedGroupIds({
  supabase,
  schoolId,
  academicPeriodId,
  gradeLevelId,
}) {
  const { data: groups, error } = await supabase
    .from("groups")
    .select("id")
    .eq("school_id", schoolId)
    .eq("academic_period_id", academicPeriodId)
    .eq("grade_level_id", gradeLevelId);

  if (error) {
    console.error("Error consultando grupos relacionados:", error);

    return {
      groupIds: [],
      error,
    };
  }

  return {
    groupIds: (groups ?? []).map((group) => group.id),
    error: null,
  };
}

/**
 * teaching_assignments no contiene
 * grade_level_id directamente.
 *
 * El grado se obtiene mediante:
 *
 * teaching_assignments.group_id
 * -> groups.grade_level_id
 */
async function getRelatedAssignmentIds({
  supabase,
  schoolId,
  academicPeriodId,
  gradeLevelId,
  subjectId,
}) {
  const { groupIds, error: groupsError } = await getRelatedGroupIds({
    supabase,
    schoolId,
    academicPeriodId,
    gradeLevelId,
  });

  if (groupsError) {
    return {
      assignmentIds: [],
      error: groupsError,
    };
  }

  if (!groupIds.length) {
    return {
      assignmentIds: [],
      error: null,
    };
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("teaching_assignments")
    .select("id")
    .eq("school_id", schoolId)
    .eq("academic_period_id", academicPeriodId)
    .eq("subject_id", subjectId)
    .in("group_id", groupIds);

  if (assignmentsError) {
    console.error(
      "Error consultando asignaciones relacionadas:",
      assignmentsError,
    );

    return {
      assignmentIds: [],
      error: assignmentsError,
    };
  }

  return {
    assignmentIds: (assignments ?? []).map((assignment) => assignment.id),
    error: null,
  };
}

/**
 * Sincroniza las reglas de una carga
 * curricular con las asignaciones
 * docentes que ya existen.
 */
async function syncTeachingAssignments({
  supabase,
  schoolId,
  academicPeriodId,
  gradeLevelId,
  subjectId,
  weeklyPeriods,
  maxPeriodsPerDay,
  minDaysPerWeek,
  allowConsecutivePeriods,
  preferredBlockSize,
}) {
  const { groupIds, error: groupsError } = await getRelatedGroupIds({
    supabase,
    schoolId,
    academicPeriodId,
    gradeLevelId,
  });

  if (groupsError) {
    return groupsError;
  }

  if (!groupIds.length) {
    return null;
  }

  const { error } = await supabase
    .from("teaching_assignments")
    .update({
      weekly_periods: weeklyPeriods,

      max_periods_per_day: maxPeriodsPerDay,

      min_days_per_week: minDaysPerWeek,

      allow_consecutive_periods: allowConsecutivePeriods,

      preferred_block_size: preferredBlockSize,
    })
    .eq("school_id", schoolId)
    .eq("academic_period_id", academicPeriodId)
    .eq("subject_id", subjectId)
    .in("group_id", groupIds);

  if (error) {
    console.error("Error sincronizando asignaciones:", error);
  }

  return error;
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

  const allowConsecutivePeriods = getBoolean(
    formData,
    "allowConsecutivePeriods",
  );

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

  const validationMessage = validateCurriculumRules({
    weeklyPeriods,
    maxPeriodsPerDay,
    minDaysPerWeek,
    preferredBlockSize,
    allowConsecutivePeriods,
  });

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: activeAcademicPeriod, error: periodError } =
    await getActiveAcademicPeriod({
      supabase,
      schoolId: school.id,
    });

  if (periodError) {
    console.error("Error obteniendo ciclo escolar activo:", periodError);

    return {
      success: false,
      message:
        "No fue posible obtener el ciclo escolar activo." +
        getErrorDetail(periodError),
    };
  }

  if (!activeAcademicPeriod) {
    return {
      success: false,
      message: "Primero debes configurar un ciclo escolar activo.",
    };
  }

  const catalogValidation = await validateSubjectAndGrade({
    supabase,
    schoolId: school.id,
    subjectId,
    gradeLevelId,
  });

  if (!catalogValidation.success) {
    return catalogValidation;
  }

  const { error: saveError } = await supabase
    .from("curriculum_requirements")
    .upsert(
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

  if (saveError) {
    console.error("Error guardando carga curricular:", saveError);

    return {
      success: false,
      message:
        "No fue posible guardar la carga curricular." +
        getErrorDetail(saveError),
    };
  }

  const assignmentsSyncError = await syncTeachingAssignments({
    supabase,
    schoolId: school.id,

    academicPeriodId: activeAcademicPeriod.id,

    gradeLevelId,
    subjectId,
    weeklyPeriods,
    maxPeriodsPerDay,
    minDaysPerWeek,
    allowConsecutivePeriods,
    preferredBlockSize,
  });

  if (assignmentsSyncError) {
    return {
      success: false,
      message:
        "La carga fue guardada, pero las asignaciones existentes no pudieron sincronizarse." +
        getErrorDetail(assignmentsSyncError),
    };
  }

  revalidateCurriculumPages();

  return {
    success: true,
    message: "Carga curricular guardada correctamente.",
  };
}

export async function updateCurriculumRequirementAction(formData) {
  const requirementId = getString(formData, "requirementId");

  /*
   * Estos campos son opcionales para
   * mantener compatibilidad con el modal
   * que solo edita las reglas.
   *
   * Cuando agregues selectores de materia
   * y grado, también podrán actualizarse.
   */
  const requestedSubjectId = getString(formData, "subjectId");

  const requestedGradeLevelId = getString(formData, "gradeLevelId");

  const weeklyPeriods = getPositiveInteger(formData, "weeklyPeriods");

  const maxPeriodsPerDay = getPositiveInteger(formData, "maxPeriodsPerDay");

  const minDaysPerWeek = getPositiveInteger(formData, "minDaysPerWeek");

  const preferredBlockSize = getPositiveInteger(formData, "preferredBlockSize");

  const allowConsecutivePeriods = getBoolean(
    formData,
    "allowConsecutivePeriods",
  );

  if (!requirementId) {
    return {
      success: false,
      message: "No fue posible identificar la carga curricular.",
    };
  }

  const validationMessage = validateCurriculumRules({
    weeklyPeriods,
    maxPeriodsPerDay,
    minDaysPerWeek,
    preferredBlockSize,
    allowConsecutivePeriods,
  });

  if (validationMessage) {
    return {
      success: false,
      message: validationMessage,
    };
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: existingRequirement, error: requirementError } = await supabase
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
      message:
        "No fue posible consultar la carga curricular." +
        getErrorDetail(requirementError),
    };
  }

  if (!existingRequirement) {
    return {
      success: false,
      message: "La carga curricular no existe o no pertenece a esta escuela.",
    };
  }

  const subjectId = requestedSubjectId || existingRequirement.subject_id;

  const gradeLevelId =
    requestedGradeLevelId || existingRequirement.grade_level_id;

  const catalogValidation = await validateSubjectAndGrade({
    supabase,
    schoolId: school.id,
    subjectId,
    gradeLevelId,
  });

  if (!catalogValidation.success) {
    return catalogValidation;
  }

  const changesCatalog =
    subjectId !== existingRequirement.subject_id ||
    gradeLevelId !== existingRequirement.grade_level_id;

  /*
   * Solo se permite cambiar la materia o
   * el grado cuando la carga todavía no
   * tiene asignaciones docentes.
   */
  if (changesCatalog) {
    const { assignmentIds, error: assignmentsError } =
      await getRelatedAssignmentIds({
        supabase,
        schoolId: school.id,

        academicPeriodId: existingRequirement.academic_period_id,

        gradeLevelId: existingRequirement.grade_level_id,

        subjectId: existingRequirement.subject_id,
      });

    if (assignmentsError) {
      return {
        success: false,
        message:
          "No fue posible comprobar las asignaciones relacionadas." +
          getErrorDetail(assignmentsError),
      };
    }

    if (assignmentIds.length > 0) {
      return {
        success: false,
        message:
          "No puedes cambiar la materia o el grado porque esta carga ya tiene asignaciones docentes. Elimina primero esas asignaciones.",
      };
    }
  }

  const { data: updatedRequirement, error: updateError } = await supabase
    .from("curriculum_requirements")
    .update({
      grade_level_id: gradeLevelId,

      subject_id: subjectId,

      weekly_periods: weeklyPeriods,

      max_periods_per_day: maxPeriodsPerDay,

      min_days_per_week: minDaysPerWeek,

      allow_consecutive_periods: allowConsecutivePeriods,

      preferred_block_size: preferredBlockSize,
    })
    .eq("id", requirementId)
    .eq("school_id", school.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Error actualizando carga curricular:", updateError);

    if (updateError.code === "23505") {
      return {
        success: false,
        message: "Ya existe una carga para esa materia y ese grado.",
      };
    }

    return {
      success: false,
      message:
        "No fue posible actualizar la carga curricular." +
        getErrorDetail(updateError),
    };
  }

  if (!updatedRequirement) {
    return {
      success: false,
      message:
        "La carga curricular no pudo actualizarse. Revisa los permisos de Supabase.",
    };
  }

  const assignmentsSyncError = await syncTeachingAssignments({
    supabase,
    schoolId: school.id,

    academicPeriodId: existingRequirement.academic_period_id,

    gradeLevelId,
    subjectId,
    weeklyPeriods,
    maxPeriodsPerDay,
    minDaysPerWeek,
    allowConsecutivePeriods,
    preferredBlockSize,
  });

  if (assignmentsSyncError) {
    return {
      success: false,
      message:
        "La carga fue actualizada, pero las asignaciones existentes no pudieron sincronizarse." +
        getErrorDetail(assignmentsSyncError),
    };
  }

  revalidateCurriculumPages();

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

  if (requirementError) {
    console.error("Error consultando carga curricular:", requirementError);

    return {
      success: false,
      message:
        "No fue posible consultar la carga curricular." +
        getErrorDetail(requirementError),
    };
  }

  if (!requirement) {
    return {
      success: false,
      message: "La carga curricular no existe.",
    };
  }

  const { assignmentIds, error: assignmentsError } =
    await getRelatedAssignmentIds({
      supabase,
      schoolId: school.id,

      academicPeriodId: requirement.academic_period_id,

      gradeLevelId: requirement.grade_level_id,

      subjectId: requirement.subject_id,
    });

  if (assignmentsError) {
    return {
      success: false,
      message:
        "No fue posible consultar las asignaciones relacionadas." +
        getErrorDetail(assignmentsError),
    };
  }

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
          "No fue posible eliminar las clases relacionadas con la carga." +
          getErrorDetail(entriesDeleteError),
      };
    }

    const { error: assignmentsDeleteError } = await supabase
      .from("teaching_assignments")
      .delete()
      .eq("school_id", school.id)
      .in("id", assignmentIds);

    if (assignmentsDeleteError) {
      console.error(
        "Error eliminando asignaciones relacionadas:",
        assignmentsDeleteError,
      );

      return {
        success: false,
        message:
          "No fue posible eliminar las asignaciones relacionadas." +
          getErrorDetail(assignmentsDeleteError),
      };
    }
  }

  const { data: deletedRequirement, error: deleteError } = await supabase
    .from("curriculum_requirements")
    .delete()
    .eq("id", requirementId)
    .eq("school_id", school.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    console.error("Error eliminando carga curricular:", deleteError);

    return {
      success: false,
      message:
        "No fue posible eliminar la carga curricular." +
        getErrorDetail(deleteError),
    };
  }

  if (!deletedRequirement) {
    return {
      success: false,
      message: "La carga no se eliminó. Revisa los permisos de Supabase.",
    };
  }

  revalidateCurriculumPages();

  return {
    success: true,
    message: "Carga curricular eliminada correctamente.",
  };
}
