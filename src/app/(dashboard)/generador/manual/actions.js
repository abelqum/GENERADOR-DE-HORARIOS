"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function getInteger(formData, field) {
  const value = Number.parseInt(getString(formData, field), 10);

  return Number.isInteger(value) ? value : null;
}

function successResponse(message) {
  return {
    success: true,
    message,
  };
}

function errorResponse(message) {
  return {
    success: false,
    message,
  };
}

function logSupabaseError(title, error) {
  if (!error) {
    return;
  }

  console.error(title, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
}

function buildManualVersionName(academicPeriodName) {
  const date = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",

    timeStyle: "short",

    timeZone: "America/Mexico_City",
  }).format(new Date());

  return `Horario manual · ${academicPeriodName} · ${date}`;
}

/*
 * ============================================================
 * CREAR LIENZO MANUAL
 * ============================================================
 */

export async function createManualScheduleVersionAction(formData) {
  const requestedName = getString(formData, "name");

  const { school, user } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: academicPeriod, error: academicPeriodError } = await supabase
    .from("academic_periods")
    .select(
      `
      id,
      name,
      active
    `,
    )
    .eq("school_id", school.id)
    .eq("active", true)
    .maybeSingle();

  if (academicPeriodError) {
    logSupabaseError("Error obteniendo ciclo escolar:", academicPeriodError);

    return;
  }

  if (!academicPeriod) {
    return;
  }

  const versionName =
    requestedName || buildManualVersionName(academicPeriod.name);

  const { data: scheduleVersion, error: versionError } = await supabase
    .from("schedule_versions")
    .insert({
      school_id: school.id,

      academic_period_id: academicPeriod.id,

      name: versionName,

      status: "draft",

      /*
       * No salió de OR-Tools.
       * "unknown" ya forma parte
       * de los estados manejados
       * por el proyecto.
       */
      solver_status: "unknown",

      objective_value: null,

      solver_statistics: {
        mode: "manual",

        source: "manual_builder",
      },

      warnings: ["Horario construido manualmente."],

      generated_by: user.id,

      source_version_id: null,
    })
    .select(
      `
      id,
      name
    `,
    )
    .single();

  if (versionError) {
    logSupabaseError("Error creando versión manual:", versionError);

    return;
  }

  /*
   * Copiamos los Talleres configurados
   * como snapshot de esta versión.
   *
   * De esta manera el lienzo manual
   * respeta exactamente los mismos
   * Talleres que el generador.
   */
  const { data: fixedPeriods, error: fixedPeriodsError } = await supabase
    .from("group_fixed_periods")
    .select(
      `
      id,
      block_id,
      group_id,
      day_of_week,
      shift_period_id,
      slot_order,
      activity_type,
      label,
      color
    `,
    )
    .eq("school_id", school.id)
    .eq("academic_period_id", academicPeriod.id)
    .eq("activity_type", "workshop");

  if (fixedPeriodsError) {
    logSupabaseError("Error obteniendo Talleres:", fixedPeriodsError);

    await supabase
      .from("schedule_versions")
      .delete()
      .eq("id", scheduleVersion.id);

    return;
  }

  if (fixedPeriods?.length) {
    const fixedPayload = fixedPeriods.map((fixedPeriod) => ({
      school_id: school.id,

      academic_period_id: academicPeriod.id,

      schedule_version_id: scheduleVersion.id,

      source_fixed_period_id: fixedPeriod.id,

      block_id: fixedPeriod.block_id,

      group_id: fixedPeriod.group_id,

      day_of_week: fixedPeriod.day_of_week,

      shift_period_id: fixedPeriod.shift_period_id,

      slot_order: fixedPeriod.slot_order,

      activity_type: "workshop",

      label: fixedPeriod.label || "Taller",

      color: fixedPeriod.color || "#f59e0b",

      locked: true,
    }));

    const { error: fixedInsertError } = await supabase
      .from("schedule_fixed_entries")
      .insert(fixedPayload);

    if (fixedInsertError) {
      logSupabaseError("Error copiando Talleres:", fixedInsertError);

      await supabase
        .from("schedule_versions")
        .delete()
        .eq("id", scheduleVersion.id);

      return;
    }
  }

  revalidatePath("/generador/manual");

  redirect(`/generador/manual?version=${scheduleVersion.id}`);
}

/*
 * ============================================================
 * AGREGAR CLASE MANUAL
 * ============================================================
 */

export async function addManualScheduleEntryAction(formData) {
  const versionId = getString(formData, "versionId");

  const assignmentId = getString(formData, "assignmentId");

  const dayOfWeek = getInteger(formData, "dayOfWeek");

  const shiftPeriodId = getString(formData, "shiftPeriodId");

  if (!versionId || !assignmentId || !shiftPeriodId || dayOfWeek === null) {
    return errorResponse("La información de la clase está incompleta.");
  }

  if (dayOfWeek < 1 || dayOfWeek > 5) {
    return errorResponse("El día seleccionado no es válido.");
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const [
    { data: version, error: versionError },
    { data: assignment, error: assignmentError },
    { data: targetPeriod, error: periodError },
  ] = await Promise.all([
    supabase
      .from("schedule_versions")
      .select(
        `
          id,
          status,
          academic_period_id,
          solver_statistics
        `,
      )
      .eq("id", versionId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("teaching_assignments")
      .select(
        `
          id,
          academic_period_id,
          group_id,
          subject_id,
          teacher_id,
          weekly_periods,
          max_periods_per_day
        `,
      )
      .eq("id", assignmentId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("shift_periods")
      .select(
        `
          id,
          shift_id,
          period_type,
          active
        `,
      )
      .eq("id", shiftPeriodId)
      .eq("school_id", school.id)
      .maybeSingle(),
  ]);

  if (versionError) {
    logSupabaseError("Error consultando versión:", versionError);

    return errorResponse("No fue posible consultar el lienzo manual.");
  }

  if (!version) {
    return errorResponse("La versión del horario no existe.");
  }

  if (version.status !== "draft") {
    return errorResponse(
      "Solamente se pueden agregar clases mientras el horario esté en borrador.",
    );
  }

  if (version.solver_statistics?.mode !== "manual") {
    return errorResponse("Esta versión no corresponde a un horario manual.");
  }

  if (assignmentError) {
    logSupabaseError("Error consultando asignación:", assignmentError);

    return errorResponse("No fue posible identificar la asignación.");
  }

  if (!assignment) {
    return errorResponse("La asignación seleccionada ya no existe.");
  }

  if (assignment.academic_period_id !== version.academic_period_id) {
    return errorResponse(
      "La asignación no pertenece al ciclo escolar de esta versión.",
    );
  }

  if (periodError) {
    logSupabaseError("Error consultando hora:", periodError);

    return errorResponse("No fue posible identificar la hora seleccionada.");
  }

  if (
    !targetPeriod ||
    !targetPeriod.active ||
    targetPeriod.period_type !== "class"
  ) {
    return errorResponse(
      "La celda seleccionada no corresponde a una hora de clase.",
    );
  }

  const [
    { data: group, error: groupError },
    { data: teacher, error: teacherError },
    { data: subject, error: subjectError },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select(
        `
          id,
          name,
          shift_id,
          active
        `,
      )
      .eq("id", assignment.group_id)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("teachers")
      .select(
        `
          id,
          first_name,
          last_name,
          max_daily_periods,
          max_weekly_periods,
          active
        `,
      )
      .eq("id", assignment.teacher_id)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("subjects")
      .select(
        `
          id,
          name,
          active
        `,
      )
      .eq("id", assignment.subject_id)
      .eq("school_id", school.id)
      .maybeSingle(),
  ]);

  if (groupError || teacherError || subjectError) {
    logSupabaseError("Error obteniendo grupo:", groupError);

    logSupabaseError("Error obteniendo profesor:", teacherError);

    logSupabaseError("Error obteniendo materia:", subjectError);

    return errorResponse(
      "No fue posible consultar los datos de la asignación.",
    );
  }

  if (!group || !teacher || !subject) {
    return errorResponse(
      "La asignación ya no tiene grupo, profesor o materia válidos.",
    );
  }

  if (!group.active || !teacher.active || !subject.active) {
    return errorResponse(
      "La asignación contiene un grupo, profesor o materia inactivos.",
    );
  }

  if (targetPeriod.shift_id !== group.shift_id) {
    return errorResponse(`El grupo ${group.name} pertenece a otro turno.`);
  }

  /*
   * Taller del grupo.
   */
  const { data: fixedEntry, error: fixedEntryError } = await supabase
    .from("schedule_fixed_entries")
    .select("id")
    .eq("school_id", school.id)
    .eq("schedule_version_id", version.id)
    .eq("group_id", group.id)
    .eq("day_of_week", dayOfWeek)
    .eq("shift_period_id", shiftPeriodId)
    .limit(1)
    .maybeSingle();

  if (fixedEntryError) {
    return errorResponse("No fue posible comprobar los Talleres del grupo.");
  }

  if (fixedEntry) {
    return errorResponse(`El grupo ${group.name} tiene Taller en esta hora.`);
  }

  /*
   * Conflicto del grupo.
   */
  const { data: groupConflict, error: groupConflictError } = await supabase
    .from("schedule_entries")
    .select("id")
    .eq("school_id", school.id)
    .eq("schedule_version_id", version.id)
    .eq("group_id", group.id)
    .eq("day_of_week", dayOfWeek)
    .eq("shift_period_id", shiftPeriodId)
    .limit(1)
    .maybeSingle();

  if (groupConflictError) {
    return errorResponse("No fue posible comprobar el horario del grupo.");
  }

  if (groupConflict) {
    return errorResponse(
      `El grupo ${group.name} ya tiene otra clase en esta hora.`,
    );
  }

  /*
   * Conflicto del profesor.
   */
  const { data: teacherConflict, error: teacherConflictError } = await supabase
    .from("schedule_entries")
    .select("id")
    .eq("school_id", school.id)
    .eq("schedule_version_id", version.id)
    .eq("teacher_id", teacher.id)
    .eq("day_of_week", dayOfWeek)
    .eq("shift_period_id", shiftPeriodId)
    .limit(1)
    .maybeSingle();

  if (teacherConflictError) {
    return errorResponse("No fue posible comprobar el horario del profesor.");
  }

  if (teacherConflict) {
    return errorResponse("El profesor ya tiene otra clase en esta hora.");
  }

  /*
   * Disponibilidad del profesor.
   */
  const { data: availability, error: availabilityError } = await supabase
    .from("teacher_availability")
    .select(
      `
      availability_type,
      weight
    `,
    )
    .eq("school_id", school.id)
    .eq("academic_period_id", version.academic_period_id)
    .eq("teacher_id", teacher.id)
    .eq("day_of_week", dayOfWeek)
    .eq("shift_period_id", shiftPeriodId)
    .maybeSingle();

  if (availabilityError) {
    return errorResponse(
      "No fue posible comprobar la disponibilidad del profesor.",
    );
  }

  if (availability?.availability_type === "unavailable") {
    return errorResponse(
      "El profesor está marcado como No disponible en esta hora.",
    );
  }

  /*
   * Horas ya colocadas para esta
   * asignación.
   */
  const { data: existingAssignmentEntries, error: assignmentEntriesError } =
    await supabase
      .from("schedule_entries")
      .select(
        `
      id,
      occurrence_number,
      day_of_week
    `,
      )
      .eq("school_id", school.id)
      .eq("schedule_version_id", version.id)
      .eq("teaching_assignment_id", assignment.id);

  if (assignmentEntriesError) {
    return errorResponse(
      "No fue posible comprobar las horas ya colocadas de esta asignación.",
    );
  }

  const weeklyPeriods = Number(assignment.weekly_periods);

  if ((existingAssignmentEntries?.length ?? 0) >= weeklyPeriods) {
    return errorResponse(
      `${subject.name} con ${group.name} ya tiene completas sus ${weeklyPeriods} horas semanales.`,
    );
  }

  /*
   * Máximo diario de esta
   * asignación.
   */
  const maxPeriodsPerDay = Number(assignment.max_periods_per_day);

  if (Number.isFinite(maxPeriodsPerDay) && maxPeriodsPerDay > 0) {
    const assignmentDailyCount = (existingAssignmentEntries ?? []).filter(
      (entry) => entry.day_of_week === dayOfWeek,
    ).length;

    if (assignmentDailyCount + 1 > maxPeriodsPerDay) {
      return errorResponse(
        `${subject.name} con ${group.name} permite máximo ${maxPeriodsPerDay} hora(s) en un mismo día.`,
      );
    }
  }

  /*
   * Máximo diario del profesor.
   */
  const maxDailyPeriods = Number(teacher.max_daily_periods);

  if (Number.isFinite(maxDailyPeriods) && maxDailyPeriods > 0) {
    const { count: teacherDailyCount, error: teacherDailyError } =
      await supabase
        .from("schedule_entries")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("school_id", school.id)
        .eq("schedule_version_id", version.id)
        .eq("teacher_id", teacher.id)
        .eq("day_of_week", dayOfWeek);

    if (teacherDailyError) {
      return errorResponse(
        "No fue posible comprobar la carga diaria del profesor.",
      );
    }

    if ((teacherDailyCount ?? 0) + 1 > maxDailyPeriods) {
      return errorResponse(
        `El profesor permite máximo ${maxDailyPeriods} horas diarias.`,
      );
    }
  }

  /*
   * Máximo semanal del profesor.
   */
  const maxWeeklyPeriods = Number(teacher.max_weekly_periods);

  if (Number.isFinite(maxWeeklyPeriods) && maxWeeklyPeriods > 0) {
    const { count: teacherWeeklyCount, error: teacherWeeklyError } =
      await supabase
        .from("schedule_entries")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("school_id", school.id)
        .eq("schedule_version_id", version.id)
        .eq("teacher_id", teacher.id);

    if (teacherWeeklyError) {
      return errorResponse(
        "No fue posible comprobar la carga semanal del profesor.",
      );
    }

    if ((teacherWeeklyCount ?? 0) + 1 > maxWeeklyPeriods) {
      return errorResponse(
        `El profesor permite máximo ${maxWeeklyPeriods} horas semanales.`,
      );
    }
  }

  /*
   * Buscamos el primer número de ocurrencia
   * disponible.
   *
   * Por ejemplo si existen:
   *
   * 1, 2, 4
   *
   * reutilizamos:
   *
   * 3
   */
  const usedOccurrences = new Set(
    (existingAssignmentEntries ?? [])
      .map((entry) => Number(entry.occurrence_number))
      .filter(Number.isInteger),
  );

  let occurrenceNumber = 1;

  while (usedOccurrences.has(occurrenceNumber)) {
    occurrenceNumber += 1;
  }

  const { data: insertedEntry, error: insertError } = await supabase
    .from("schedule_entries")
    .insert({
      school_id: school.id,

      schedule_version_id: version.id,

      teaching_assignment_id: assignment.id,

      group_id: group.id,

      subject_id: subject.id,

      teacher_id: teacher.id,

      occurrence_number: occurrenceNumber,

      day_of_week: dayOfWeek,

      shift_period_id: shiftPeriodId,

      /*
       * Es un lienzo manual.
       * Mientras sea borrador puede
       * seguirse modificando.
       */
      locked: false,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    logSupabaseError("Error guardando clase manual:", insertError);

    return errorResponse("No fue posible guardar la clase.");
  }

  if (!insertedEntry) {
    return errorResponse("La clase no pudo guardarse.");
  }

  /*
   * Si esa hora estaba etiquetada
   * previamente como Servicio,
   * deja de ser Servicio al colocar
   * una clase.
   */
  await supabase
    .from("schedule_teacher_slot_labels")
    .delete()
    .eq("school_id", school.id)
    .eq("schedule_version_id", version.id)
    .eq("teacher_id", teacher.id)
    .eq("day_of_week", dayOfWeek)
    .eq("shift_period_id", shiftPeriodId);

  revalidatePath("/generador/manual");

  revalidatePath(`/horarios/${version.id}`);

  const preferenceMessage =
    availability?.availability_type === "avoid"
      ? " Esta hora está marcada como una hora que conviene evitar."
      : "";

  return successResponse(
    `${subject.name} · ${group.name} agregada correctamente.${preferenceMessage}`,
  );
}

/*
 * ============================================================
 * ELIMINAR CLASE MANUAL
 * ============================================================
 */

export async function removeManualScheduleEntryAction(formData) {
  const versionId = getString(formData, "versionId");

  const entryId = getString(formData, "entryId");

  if (!versionId || !entryId) {
    return errorResponse("No fue posible identificar la clase.");
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: version, error: versionError } = await supabase
    .from("schedule_versions")
    .select(
      `
      id,
      status,
      solver_statistics
    `,
    )
    .eq("id", versionId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (versionError) {
    return errorResponse("No fue posible consultar la versión.");
  }

  if (!version) {
    return errorResponse("El horario no existe.");
  }

  if (version.status !== "draft") {
    return errorResponse("El horario ya no está en borrador.");
  }

  if (version.solver_statistics?.mode !== "manual") {
    return errorResponse("Esta versión no corresponde al constructor manual.");
  }

  const { data: deletedEntry, error: deleteError } = await supabase
    .from("schedule_entries")
    .delete()
    .eq("id", entryId)
    .eq("school_id", school.id)
    .eq("schedule_version_id", version.id)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    logSupabaseError("Error eliminando clase:", deleteError);

    return errorResponse("No fue posible eliminar la clase.");
  }

  if (!deletedEntry) {
    return errorResponse("La clase ya no existe.");
  }

  revalidatePath("/generador/manual");

  revalidatePath(`/horarios/${version.id}`);

  return successResponse("La clase fue eliminada del horario.");
}
