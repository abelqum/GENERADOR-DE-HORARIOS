"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

export async function createTeachingAssignmentAction(
  _previousState,
  formData,
) {
  const groupId = getString(formData, "groupId");
  const subjectId = getString(formData, "subjectId");
  const teacherId = getString(formData, "teacherId");

  if (!groupId) {
    return {
      success: false,
      message: "Selecciona un grupo.",
    };
  }

  if (!subjectId) {
    return {
      success: false,
      message: "Selecciona una materia.",
    };
  }

  if (!teacherId) {
    return {
      success: false,
      message: "Selecciona un profesor.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: activeAcademicPeriod, error: academicPeriodError } =
    await supabase
      .from("academic_periods")
      .select("id, name")
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle();

  if (academicPeriodError) {
    console.error(
      "Error obteniendo el ciclo escolar activo:",
      academicPeriodError,
    );

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
    { data: group, error: groupError },
    { data: teacher, error: teacherError },
    { data: subject, error: subjectError },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select(`
        id,
        name,
        active,
        academic_period_id,
        grade_level_id,
        shift_id,
        grade_level:grade_levels (
          id,
          name
        ),
        shift:shifts (
          id,
          name
        )
      `)
      .eq("id", groupId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("teachers")
      .select(`
        id,
        first_name,
        last_name,
        active,
        max_weekly_periods
      `)
      .eq("id", teacherId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("subjects")
      .select("id, name, active")
      .eq("id", subjectId)
      .eq("school_id", school.id)
      .maybeSingle(),
  ]);

  if (groupError || !group?.active) {
    return {
      success: false,
      message: "El grupo seleccionado no está disponible.",
    };
  }

  if (
    group.academic_period_id !== activeAcademicPeriod.id
  ) {
    return {
      success: false,
      message:
        "El grupo no pertenece al ciclo escolar activo.",
    };
  }

  if (teacherError || !teacher?.active) {
    return {
      success: false,
      message: "El profesor seleccionado no está disponible.",
    };
  }

  if (subjectError || !subject?.active) {
    return {
      success: false,
      message: "La materia seleccionada no está disponible.",
    };
  }

  const [
    {
      data: curriculumRequirement,
      error: curriculumRequirementError,
    },
    {
      data: teacherSubject,
      error: teacherSubjectError,
    },
    {
      data: teacherShift,
      error: teacherShiftError,
    },
  ] = await Promise.all([
    supabase
      .from("curriculum_requirements")
      .select(`
        id,
        weekly_periods,
        max_periods_per_day,
        min_days_per_week,
        allow_consecutive_periods,
        preferred_block_size
      `)
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      )
      .eq("grade_level_id", group.grade_level_id)
      .eq("subject_id", subjectId)
      .maybeSingle(),

    supabase
      .from("teacher_subjects")
      .select("id, priority, is_primary")
      .eq("school_id", school.id)
      .eq("teacher_id", teacherId)
      .eq("subject_id", subjectId)
      .maybeSingle(),

    supabase
      .from("teacher_shifts")
      .select("id, max_weekly_periods")
      .eq("school_id", school.id)
      .eq("teacher_id", teacherId)
      .eq("shift_id", group.shift_id)
      .maybeSingle(),
  ]);

  if (
    curriculumRequirementError ||
    !curriculumRequirement
  ) {
    return {
      success: false,
      message: `La materia ${subject.name} no tiene carga curricular configurada para el grado ${group.grade_level?.name ?? ""}.`,
    };
  }

  if (teacherSubjectError || !teacherSubject) {
    return {
      success: false,
      message: `El profesor ${teacher.first_name} ${teacher.last_name} no está autorizado para impartir ${subject.name}.`,
    };
  }

  if (teacherShiftError || !teacherShift) {
    return {
      success: false,
      message: `El profesor no está autorizado para trabajar en el turno ${group.shift?.name ?? ""}.`,
    };
  }

  const { data: existingAssignment, error: existingError } =
    await supabase
      .from("teaching_assignments")
      .select("id")
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      )
      .eq("group_id", groupId)
      .eq("subject_id", subjectId)
      .maybeSingle();

  if (existingError) {
    console.error(
      "Error verificando la asignación existente:",
      existingError,
    );

    return {
      success: false,
      message: "No fue posible validar la asignación.",
    };
  }

  if (existingAssignment) {
    return {
      success: false,
      message:
        "Este grupo ya tiene un profesor asignado para esa materia.",
    };
  }

  const { data: teacherAssignments, error: assignmentsError } =
    await supabase
      .from("teaching_assignments")
      .select(`
        weekly_periods,
        group:groups (
          shift_id
        )
      `)
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      )
      .eq("teacher_id", teacherId);

  if (assignmentsError) {
    console.error(
      "Error obteniendo la carga actual del profesor:",
      assignmentsError,
    );

    return {
      success: false,
      message:
        "No fue posible validar la carga actual del profesor.",
    };
  }

  const currentWeeklyLoad = (teacherAssignments ?? []).reduce(
    (total, assignment) =>
      total + (assignment.weekly_periods ?? 0),
    0,
  );

  const newWeeklyLoad =
    currentWeeklyLoad +
    curriculumRequirement.weekly_periods;

  if (newWeeklyLoad > teacher.max_weekly_periods) {
    return {
      success: false,
      message: `La asignación superaría el máximo semanal del profesor. Actualmente tiene ${currentWeeklyLoad} de ${teacher.max_weekly_periods} horas.`,
    };
  }

  const currentShiftLoad = (teacherAssignments ?? [])
    .filter(
      (assignment) =>
        assignment.group?.shift_id === group.shift_id,
    )
    .reduce(
      (total, assignment) =>
        total + (assignment.weekly_periods ?? 0),
      0,
    );

  const newShiftLoad =
    currentShiftLoad +
    curriculumRequirement.weekly_periods;

  if (
    teacherShift.max_weekly_periods &&
    newShiftLoad > teacherShift.max_weekly_periods
  ) {
    return {
      success: false,
      message: `La asignación superaría el máximo del profesor para el turno ${group.shift?.name ?? ""}. Actualmente tiene ${currentShiftLoad} de ${teacherShift.max_weekly_periods} horas.`,
    };
  }

  const { error: insertError } = await supabase
    .from("teaching_assignments")
    .insert({
      school_id: school.id,
      academic_period_id: activeAcademicPeriod.id,
      group_id: groupId,
      subject_id: subjectId,
      teacher_id: teacherId,
      weekly_periods:
        curriculumRequirement.weekly_periods,
      max_periods_per_day:
        curriculumRequirement.max_periods_per_day,
      min_days_per_week:
        curriculumRequirement.min_days_per_week,
      allow_consecutive_periods:
        curriculumRequirement.allow_consecutive_periods,
      preferred_block_size:
        curriculumRequirement.preferred_block_size,
      locked: false,
    });

  if (insertError) {
    console.error(
      "Error creando asignación docente:",
      insertError,
    );

    if (insertError.code === "23505") {
      return {
        success: false,
        message:
          "Este grupo ya tiene una asignación para esa materia.",
      };
    }

    return {
      success: false,
      message:
        "No fue posible registrar la asignación docente.",
    };
  }

  revalidatePath("/asignaciones");
  revalidatePath("/profesores");
  revalidatePath("/grupos");
  revalidatePath("/");

  return {
    success: true,
    message: "Asignación docente registrada correctamente.",
  };
}
export async function updateTeachingAssignmentAction(
  formData,
) {
  const assignmentId = getString(
    formData,
    "assignmentId",
  );

  const teacherId = getString(
    formData,
    "teacherId",
  );

  const weeklyPeriods = Number.parseInt(
    getString(formData, "weeklyPeriods"),
    10,
  );

  const maxPeriodsPerDay = Number.parseInt(
    getString(formData, "maxPeriodsPerDay"),
    10,
  );

  const minDaysPerWeek = Number.parseInt(
    getString(formData, "minDaysPerWeek"),
    10,
  );

  const preferredBlockSize = Number.parseInt(
    getString(formData, "preferredBlockSize"),
    10,
  );

  const allowConsecutivePeriods =
    getString(
      formData,
      "allowConsecutivePeriods",
    ) === "true";

  const locked =
    getString(formData, "locked") === "true";

  if (!assignmentId) {
    return {
      success: false,
      message:
        "No fue posible identificar la asignación.",
    };
  }

  if (!teacherId) {
    return {
      success: false,
      message:
        "Selecciona un profesor.",
    };
  }

  if (
    !Number.isInteger(weeklyPeriods) ||
    weeklyPeriods < 1
  ) {
    return {
      success: false,
      message:
        "Las horas semanales deben ser mayores que cero.",
    };
  }

  if (
    !Number.isInteger(maxPeriodsPerDay) ||
    maxPeriodsPerDay < 1
  ) {
    return {
      success: false,
      message:
        "El máximo diario debe ser mayor que cero.",
    };
  }

  if (maxPeriodsPerDay > weeklyPeriods) {
    return {
      success: false,
      message:
        "El máximo diario no puede superar las horas semanales.",
    };
  }

  if (
    !Number.isInteger(minDaysPerWeek) ||
    minDaysPerWeek < 1 ||
    minDaysPerWeek > 7
  ) {
    return {
      success: false,
      message:
        "El mínimo de días debe estar entre 1 y 7.",
    };
  }

  if (minDaysPerWeek > weeklyPeriods) {
    return {
      success: false,
      message:
        "El mínimo de días no puede superar las horas semanales.",
    };
  }

  if (
    !Number.isInteger(preferredBlockSize) ||
    preferredBlockSize < 1
  ) {
    return {
      success: false,
      message:
        "El tamaño del bloque debe ser mayor que cero.",
    };
  }

  if (preferredBlockSize > maxPeriodsPerDay) {
    return {
      success: false,
      message:
        "El bloque preferido no puede superar el máximo diario.",
    };
  }

  if (
    !allowConsecutivePeriods &&
    preferredBlockSize > 1
  ) {
    return {
      success: false,
      message:
        "Debes permitir horas consecutivas para usar bloques mayores a uno.",
    };
  }

  const { school } =
    await getCurrentSchool();

  const supabase =
    await createClient();

  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from("teaching_assignments")
    .select(`
      id,
      academic_period_id,
      group_id,
      subject_id,
      teacher_id,
      weekly_periods,
      group:groups (
        id,
        name,
        shift_id,
        grade_level_id,
        shift:shifts (
          id,
          name
        )
      ),
      subject:subjects (
        id,
        name
      )
    `)
    .eq("id", assignmentId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (assignmentError) {
    console.error(
      "Error consultando asignación:",
      assignmentError,
    );

    return {
      success: false,
      message:
        "No fue posible consultar la asignación.",
    };
  }

  if (!assignment) {
    return {
      success: false,
      message:
        "La asignación no existe o no pertenece a esta escuela.",
    };
  }

  const group = Array.isArray(
    assignment.group,
  )
    ? assignment.group[0]
    : assignment.group;

  const subject = Array.isArray(
    assignment.subject,
  )
    ? assignment.subject[0]
    : assignment.subject;

  const shift = Array.isArray(
    group?.shift,
  )
    ? group.shift[0]
    : group?.shift;

  if (!group || !subject) {
    return {
      success: false,
      message:
        "La asignación no tiene un grupo o materia válidos.",
    };
  }

  const [
    {
      data: teacher,
      error: teacherError,
    },
    {
      data: teacherSubject,
      error: teacherSubjectError,
    },
    {
      data: teacherShift,
      error: teacherShiftError,
    },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select(`
        id,
        first_name,
        last_name,
        active,
        max_weekly_periods
      `)
      .eq("id", teacherId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("teacher_subjects")
      .select("id")
      .eq("school_id", school.id)
      .eq("teacher_id", teacherId)
      .eq(
        "subject_id",
        assignment.subject_id,
      )
      .maybeSingle(),

    supabase
      .from("teacher_shifts")
      .select(`
        id,
        max_weekly_periods
      `)
      .eq("school_id", school.id)
      .eq("teacher_id", teacherId)
      .eq("shift_id", group.shift_id)
      .maybeSingle(),
  ]);

  if (teacherError || !teacher?.active) {
    return {
      success: false,
      message:
        "El profesor seleccionado no está disponible.",
    };
  }

  if (
    teacherSubjectError ||
    !teacherSubject
  ) {
    return {
      success: false,
      message: `El profesor no está autorizado para impartir ${subject.name}.`,
    };
  }

  if (teacherShiftError || !teacherShift) {
    return {
      success: false,
      message: `El profesor no está autorizado para trabajar en el turno ${shift?.name ?? ""}.`,
    };
  }

  /*
   * Obtenemos las demás asignaciones del profesor.
   * Excluimos la asignación que estamos editando.
   */
  const {
    data: teacherAssignments,
    error: teacherAssignmentsError,
  } = await supabase
    .from("teaching_assignments")
    .select(`
      id,
      weekly_periods,
      group:groups (
        shift_id
      )
    `)
    .eq("school_id", school.id)
    .eq(
      "academic_period_id",
      assignment.academic_period_id,
    )
    .eq("teacher_id", teacherId)
    .neq("id", assignmentId);

  if (teacherAssignmentsError) {
    console.error(
      "Error consultando carga del profesor:",
      teacherAssignmentsError,
    );

    return {
      success: false,
      message:
        "No fue posible validar la carga del profesor.",
    };
  }

  const normalizedAssignments =
    (teacherAssignments ?? []).map(
      (currentAssignment) => {
        const currentGroup =
          Array.isArray(
            currentAssignment.group,
          )
            ? currentAssignment.group[0]
            : currentAssignment.group;

        return {
          ...currentAssignment,
          group: currentGroup,
        };
      },
    );

  const currentWeeklyLoad =
    normalizedAssignments.reduce(
      (total, currentAssignment) =>
        total +
        Number(
          currentAssignment.weekly_periods ??
            0,
        ),
      0,
    );

  const newWeeklyLoad =
    currentWeeklyLoad + weeklyPeriods;

  if (
    teacher.max_weekly_periods &&
    newWeeklyLoad >
      teacher.max_weekly_periods
  ) {
    return {
      success: false,
      message: `La asignación superaría el máximo semanal del profesor. La nueva carga sería de ${newWeeklyLoad} horas y su límite es ${teacher.max_weekly_periods}.`,
    };
  }

  const currentShiftLoad =
    normalizedAssignments
      .filter(
        (currentAssignment) =>
          currentAssignment.group
            ?.shift_id ===
          group.shift_id,
      )
      .reduce(
        (total, currentAssignment) =>
          total +
          Number(
            currentAssignment.weekly_periods ??
              0,
          ),
        0,
      );

  const newShiftLoad =
    currentShiftLoad + weeklyPeriods;

  if (
    teacherShift.max_weekly_periods &&
    newShiftLoad >
      teacherShift.max_weekly_periods
  ) {
    return {
      success: false,
      message: `La asignación superaría el máximo del profesor para el turno ${shift?.name ?? ""}. La nueva carga sería de ${newShiftLoad} horas y su límite es ${teacherShift.max_weekly_periods}.`,
    };
  }

  /*
   * Si esta asignación ya se utilizó en un horario,
   * evitamos cambiar profesor o cantidad de horas.
   */
  const {
    count: scheduleEntriesCount,
    error: scheduleEntriesError,
  } = await supabase
    .from("schedule_entries")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("school_id", school.id)
    .eq(
      "teaching_assignment_id",
      assignmentId,
    );

  if (scheduleEntriesError) {
    console.error(
      "Error consultando horarios relacionados:",
      scheduleEntriesError,
    );

    return {
      success: false,
      message:
        "No fue posible verificar los horarios relacionados.",
    };
  }

  const isUsedInSchedule =
    (scheduleEntriesCount ?? 0) > 0;

  if (
    isUsedInSchedule &&
    (
      teacherId !== assignment.teacher_id ||
      weeklyPeriods !==
        assignment.weekly_periods
    )
  ) {
    return {
      success: false,
      message:
        "Esta asignación ya se utilizó en un horario. No puedes cambiar el profesor ni sus horas semanales sin eliminar primero las versiones relacionadas.",
    };
  }

  const { error } = await supabase
    .from("teaching_assignments")
    .update({
      teacher_id: teacherId,
      weekly_periods: weeklyPeriods,
      max_periods_per_day:
        maxPeriodsPerDay,
      min_days_per_week:
        minDaysPerWeek,
      allow_consecutive_periods:
        allowConsecutivePeriods,
      preferred_block_size:
        preferredBlockSize,
      locked,
    })
    .eq("id", assignmentId)
    .eq("school_id", school.id);

  if (error) {
    console.error(
      "Error actualizando asignación:",
      error,
    );

    return {
      success: false,
      message:
        "No fue posible actualizar la asignación docente.",
    };
  }

  revalidatePath("/asignaciones");
  revalidatePath("/profesores");
  revalidatePath("/grupos");
  revalidatePath("/generador");
  revalidatePath("/horarios");
  revalidatePath("/");

  return {
    success: true,
    message:
      "Asignación docente actualizada correctamente.",
  };
}
export async function toggleTeachingAssignmentLockAction(
  formData,
) {
  const assignmentId = getString(
    formData,
    "assignmentId",
  );

  const nextLocked =
    getString(formData, "nextLocked") === "true";

  if (!assignmentId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("teaching_assignments")
    .update({
      locked: nextLocked,
    })
    .eq("id", assignmentId)
    .eq("school_id", school.id);

  if (error) {
    console.error(
      "Error actualizando bloqueo de asignación:",
      error,
    );

    return;
  }

  revalidatePath("/asignaciones");
}

export async function deleteTeachingAssignmentAction(
  formData,
) {
  const assignmentId = getString(
    formData,
    "assignmentId",
  );

  if (!assignmentId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { count: entriesCount, error: countError } =
    await supabase
      .from("schedule_entries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("teaching_assignment_id", assignmentId);

  if (countError) {
    console.error(
      "Error verificando entradas del horario:",
      countError,
    );

    return;
  }

  if ((entriesCount ?? 0) > 0) {
    console.error(
      "No se puede eliminar una asignación utilizada en un horario.",
    );

    return;
  }

  const { error } = await supabase
    .from("teaching_assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("school_id", school.id);

  if (error) {
    console.error(
      "Error eliminando asignación docente:",
      error,
    );

    return;
  }

  revalidatePath("/asignaciones");
  revalidatePath("/profesores");
  revalidatePath("/");
}