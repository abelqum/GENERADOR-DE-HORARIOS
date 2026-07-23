"use server";

import {
  revalidatePath,
} from "next/cache";

import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { buildSchedulePayload } from "@/lib/scheduler/buildSchedulePayload";
import { saveScheduleResult } from "@/lib/scheduler/saveScheduleResult";
import { validateScheduleConfiguration } from "@/lib/scheduler/validateScheduleConfiguration";
import { solveSchedule } from "@/lib/solver/client";
import { createClient } from "@/lib/supabase/server";

function getString(
  formData,
  field,
) {
  return String(
    formData.get(field) ?? "",
  ).trim();
}

function getInteger(
  formData,
  field,
) {
  const value =
    Number.parseInt(
      getString(
        formData,
        field,
      ),
      10,
    );

  return Number.isInteger(
    value,
  )
    ? value
    : null;
}

function successResponse(
  message,
) {
  return {
    success: true,
    message,
  };
}

function errorResponse(
  message,
) {
  return {
    success: false,
    message,
  };
}

function logSupabaseError(
  title,
  error,
) {
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

export async function moveScheduleEntryAction(
  formData,
) {
  const versionId =
    getString(
      formData,
      "versionId",
    );

  const entryId =
    getString(
      formData,
      "entryId",
    );

  const targetDay =
    getInteger(
      formData,
      "targetDay",
    );

  const targetPeriodId =
    getString(
      formData,
      "targetPeriodId",
    );

  if (
    !versionId ||
    !entryId ||
    targetDay === null ||
    !targetPeriodId
  ) {
    return errorResponse(
      "La solicitud para mover la clase está incompleta.",
    );
  }

  if (
    targetDay < 1 ||
    targetDay > 5
  ) {
    return errorResponse(
      "El día seleccionado no es válido.",
    );
  }

  const { school } =
    await getCurrentSchool();

  const supabase =
    await createClient();

  const [
    {
      data: version,
      error: versionError,
    },
    {
      data: entry,
      error: entryError,
    },
    {
      data: targetPeriod,
      error: periodError,
    },
  ] = await Promise.all([
    supabase
      .from(
        "schedule_versions",
      )
      .select(`
        id,
        status,
        academic_period_id
      `)
      .eq("id", versionId)
      .eq(
        "school_id",
        school.id,
      )
      .maybeSingle(),

    supabase
      .from(
        "schedule_entries",
      )
      .select(`
        id,
        schedule_version_id,
        teaching_assignment_id,
        group_id,
        subject_id,
        teacher_id,
        shift_period_id,
        day_of_week,
        locked
      `)
      .eq("id", entryId)
      .eq(
        "school_id",
        school.id,
      )
      .maybeSingle(),

    supabase
      .from(
        "shift_periods",
      )
      .select(`
        id,
        shift_id,
        name,
        period_type,
        active
      `)
      .eq(
        "id",
        targetPeriodId,
      )
      .eq(
        "school_id",
        school.id,
      )
      .maybeSingle(),
  ]);

  if (versionError) {
    logSupabaseError(
      "Error consultando versión:",
      versionError,
    );

    return errorResponse(
      "No fue posible consultar la versión del horario.",
    );
  }

  if (!version) {
    return errorResponse(
      "La versión del horario no existe.",
    );
  }

  if (
    version.status !==
    "draft"
  ) {
    return errorResponse(
      "Solamente se pueden mover clases en una versión en borrador.",
    );
  }

  if (entryError) {
    logSupabaseError(
      "Error consultando clase:",
      entryError,
    );

    return errorResponse(
      "No fue posible consultar la clase seleccionada.",
    );
  }

  if (!entry) {
    return errorResponse(
      "La clase que intentas mover no existe.",
    );
  }

  if (
    entry.schedule_version_id !==
    version.id
  ) {
    return errorResponse(
      "La clase no pertenece a esta versión del horario.",
    );
  }

  if (entry.locked) {
    return errorResponse(
      "La clase está bloqueada y no puede moverse.",
    );
  }

  if (periodError) {
    logSupabaseError(
      "Error consultando hora destino:",
      periodError,
    );

    return errorResponse(
      "No fue posible consultar la hora seleccionada.",
    );
  }

  if (
    !targetPeriod ||
    !targetPeriod.active ||
    targetPeriod.period_type !==
      "class"
  ) {
    return errorResponse(
      "La celda seleccionada no corresponde a una hora de clase válida.",
    );
  }

  let groupId =
    entry.group_id;

  let subjectId =
    entry.subject_id;

  let teacherId =
    entry.teacher_id;

  /*
   * Para entradas antiguas que no tengan los IDs
   * guardados directamente, los obtenemos desde
   * teaching_assignments.
   */
  if (
    (
      !groupId ||
      !subjectId ||
      !teacherId
    ) &&
    entry.teaching_assignment_id
  ) {
    const {
      data: assignment,
      error:
        assignmentError,
    } = await supabase
      .from(
        "teaching_assignments",
      )
      .select(`
        id,
        group_id,
        subject_id,
        teacher_id
      `)
      .eq(
        "id",
        entry.teaching_assignment_id,
      )
      .eq(
        "school_id",
        school.id,
      )
      .maybeSingle();

    if (assignmentError) {
      logSupabaseError(
        "Error consultando asignación:",
        assignmentError,
      );

      return errorResponse(
        "No fue posible identificar la asignación de la clase.",
      );
    }

    groupId =
      groupId ??
      assignment?.group_id ??
      null;

    subjectId =
      subjectId ??
      assignment?.subject_id ??
      null;

    teacherId =
      teacherId ??
      assignment?.teacher_id ??
      null;
  }

  if (
    !groupId ||
    !subjectId ||
    !teacherId
  ) {
    return errorResponse(
      "La clase no tiene grupo, materia o profesor asociados.",
    );
  }

  const [
    {
      data: group,
      error: groupError,
    },
    {
      data: teacher,
      error: teacherError,
    },
  ] = await Promise.all([
    supabase
      .from("groups")
      .select(`
        id,
        name,
        shift_id
      `)
      .eq("id", groupId)
      .eq(
        "school_id",
        school.id,
      )
      .maybeSingle(),

    supabase
      .from("teachers")
      .select(`
        id,
        first_name,
        last_name,
        max_daily_periods
      `)
      .eq(
        "id",
        teacherId,
      )
      .eq(
        "school_id",
        school.id,
      )
      .maybeSingle(),
  ]);

  if (groupError) {
    logSupabaseError(
      "Error consultando grupo:",
      groupError,
    );

    return errorResponse(
      "No fue posible identificar el grupo de la clase.",
    );
  }

  if (!group) {
    return errorResponse(
      "El grupo de la clase ya no existe.",
    );
  }

  if (teacherError) {
    logSupabaseError(
      "Error consultando profesor:",
      teacherError,
    );

    return errorResponse(
      "No fue posible identificar al profesor de la clase.",
    );
  }

  if (!teacher) {
    return errorResponse(
      "El profesor de la clase ya no existe.",
    );
  }

  if (
    targetPeriod.shift_id !==
    group.shift_id
  ) {
    return errorResponse(
      "La clase no puede moverse a un turno diferente al del grupo.",
    );
  }

  if (
    entry.day_of_week ===
      targetDay &&
    entry.shift_period_id ===
      targetPeriodId
  ) {
    return successResponse(
      "La clase ya se encuentra en esa posición.",
    );
  }

  /*
   * Conflicto de grupo.
   */
  const {
    data: groupConflict,
    error:
      groupConflictError,
  } = await supabase
    .from("schedule_entries")
    .select("id")
    .eq(
      "school_id",
      school.id,
    )
    .eq(
      "schedule_version_id",
      versionId,
    )
    .eq(
      "group_id",
      groupId,
    )
    .eq(
      "day_of_week",
      targetDay,
    )
    .eq(
      "shift_period_id",
      targetPeriodId,
    )
    .neq("id", entry.id)
    .maybeSingle();

  if (groupConflictError) {
    logSupabaseError(
      "Error verificando conflicto de grupo:",
      groupConflictError,
    );

    return errorResponse(
      "No fue posible comprobar la disponibilidad del grupo.",
    );
  }

  if (groupConflict) {
    return errorResponse(
      `El grupo ${group.name} ya tiene otra clase en esa hora.`,
    );
  }

  /*
   * Conflicto de profesor.
   */
  const {
    data: teacherConflict,
    error:
      teacherConflictError,
  } = await supabase
    .from("schedule_entries")
    .select("id")
    .eq(
      "school_id",
      school.id,
    )
    .eq(
      "schedule_version_id",
      versionId,
    )
    .eq(
      "teacher_id",
      teacherId,
    )
    .eq(
      "day_of_week",
      targetDay,
    )
    .eq(
      "shift_period_id",
      targetPeriodId,
    )
    .neq("id", entry.id)
    .maybeSingle();

  if (teacherConflictError) {
    logSupabaseError(
      "Error verificando conflicto docente:",
      teacherConflictError,
    );

    return errorResponse(
      "No fue posible comprobar la disponibilidad del profesor.",
    );
  }

  if (teacherConflict) {
    return errorResponse(
      "El profesor ya tiene otra clase en esa hora.",
    );
  }

  /*
   * Disponibilidad docente.
   */
  const {
    data: availability,
    error:
      availabilityError,
  } = await supabase
    .from(
      "teacher_availability",
    )
    .select(`
      availability_type,
      weight
    `)
    .eq(
      "school_id",
      school.id,
    )
    .eq(
      "academic_period_id",
      version.academic_period_id,
    )
    .eq(
      "teacher_id",
      teacherId,
    )
    .eq(
      "day_of_week",
      targetDay,
    )
    .eq(
      "shift_period_id",
      targetPeriodId,
    )
    .maybeSingle();

  if (availabilityError) {
    logSupabaseError(
      "Error consultando disponibilidad:",
      availabilityError,
    );

    return errorResponse(
      "No fue posible comprobar la disponibilidad del profesor.",
    );
  }

  if (
    availability
      ?.availability_type ===
    "unavailable"
  ) {
    return errorResponse(
      "El profesor está marcado como no disponible en esa hora.",
    );
  }

  /*
   * Máximo diario del profesor.
   */
  const maxDailyPeriods =
    Number(
      teacher.max_daily_periods,
    );

  if (
    Number.isFinite(
      maxDailyPeriods,
    ) &&
    maxDailyPeriods > 0
  ) {
    const {
      count:
        teacherDailyCount,
      error:
        dailyCountError,
    } = await supabase
      .from(
        "schedule_entries",
      )
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "school_id",
        school.id,
      )
      .eq(
        "schedule_version_id",
        versionId,
      )
      .eq(
        "teacher_id",
        teacherId,
      )
      .eq(
        "day_of_week",
        targetDay,
      )
      .neq("id", entry.id);

    if (dailyCountError) {
      logSupabaseError(
        "Error contando carga diaria:",
        dailyCountError,
      );

      return errorResponse(
        "No fue posible comprobar la carga diaria del profesor.",
      );
    }

    if (
      (
        teacherDailyCount ??
        0
      ) +
        1 >
      maxDailyPeriods
    ) {
      return errorResponse(
        `El movimiento superaría el máximo diario de ${maxDailyPeriods} horas del profesor.`,
      );
    }
  }

  /*
   * preference_score no se actualiza porque esa columna
   * no existe en tu tabla schedule_entries.
   */
  const {
    data: updatedEntry,
    error: updateError,
  } = await supabase
    .from("schedule_entries")
    .update({
      day_of_week:
        targetDay,

      shift_period_id:
        targetPeriodId,
    })
    .eq("id", entry.id)
    .eq(
      "school_id",
      school.id,
    )
    .eq(
      "schedule_version_id",
      versionId,
    )
    .select(`
      id,
      day_of_week,
      shift_period_id
    `)
    .maybeSingle();

  if (updateError) {
    logSupabaseError(
      "Error moviendo clase:",
      updateError,
    );

    if (
      updateError.code ===
      "23505"
    ) {
      return errorResponse(
        "La celda seleccionada ya está ocupada.",
      );
    }

    return errorResponse(
      "No fue posible guardar la nueva posición.",
    );
  }

  if (!updatedEntry) {
    return errorResponse(
      "Supabase no permitió actualizar la clase. Comprueba las políticas de actualización de schedule_entries.",
    );
  }

  revalidatePath(
    `/horarios/${versionId}`,
  );

  revalidatePath(
    "/horarios",
  );

  const preferenceMessage =
    availability
      ?.availability_type ===
    "avoid"
      ? " La nueva posición está marcada como una hora que conviene evitar."
      : "";

  return successResponse(
    `La clase se movió correctamente.${preferenceMessage}`,
  );
}

export async function toggleScheduleEntryLockAction(
  formData,
) {
  const versionId =
    getString(
      formData,
      "versionId",
    );

  const entryId =
    getString(
      formData,
      "entryId",
    );

  const nextLocked =
    getString(
      formData,
      "nextLocked",
    ) === "true";

  if (
    !versionId ||
    !entryId
  ) {
    return errorResponse(
      "No fue posible identificar la clase.",
    );
  }

  const { school } =
    await getCurrentSchool();

  const supabase =
    await createClient();

  const [
    {
      data: version,
      error: versionError,
    },
    {
      data: entry,
      error: entryError,
    },
  ] = await Promise.all([
    supabase
      .from(
        "schedule_versions",
      )
      .select(
        "id, status",
      )
      .eq("id", versionId)
      .eq(
        "school_id",
        school.id,
      )
      .maybeSingle(),

    supabase
      .from(
        "schedule_entries",
      )
      .select(`
        id,
        schedule_version_id,
        locked
      `)
      .eq("id", entryId)
      .eq(
        "school_id",
        school.id,
      )
      .maybeSingle(),
  ]);

  if (versionError) {
    logSupabaseError(
      "Error consultando versión:",
      versionError,
    );

    return errorResponse(
      "No fue posible consultar la versión del horario.",
    );
  }

  if (!version) {
    return errorResponse(
      "La versión del horario no existe.",
    );
  }

  if (
    version.status !==
    "draft"
  ) {
    return errorResponse(
      "Solamente se pueden bloquear clases en una versión en borrador.",
    );
  }

  if (entryError) {
    logSupabaseError(
      "Error consultando clase:",
      entryError,
    );

    return errorResponse(
      "No fue posible consultar la clase.",
    );
  }

  if (!entry) {
    return errorResponse(
      "La clase seleccionada no existe.",
    );
  }

  if (
    entry.schedule_version_id !==
    version.id
  ) {
    return errorResponse(
      "La clase no pertenece a esta versión del horario.",
    );
  }

  if (
    entry.locked ===
    nextLocked
  ) {
    return successResponse(
      nextLocked
        ? "La clase ya estaba bloqueada."
        : "La clase ya estaba desbloqueada.",
    );
  }

  const {
    data: updatedEntry,
    error: updateError,
  } = await supabase
    .from("schedule_entries")
    .update({
      locked: nextLocked,
    })
    .eq("id", entry.id)
    .eq(
      "school_id",
      school.id,
    )
    .eq(
      "schedule_version_id",
      version.id,
    )
    .select(
      "id, locked",
    )
    .maybeSingle();

  if (updateError) {
    logSupabaseError(
      "Error actualizando bloqueo:",
      updateError,
    );

    return errorResponse(
      "No fue posible actualizar el bloqueo de la clase.",
    );
  }

  if (!updatedEntry) {
    return errorResponse(
      "Supabase no permitió actualizar el bloqueo. Comprueba las políticas de actualización de schedule_entries.",
    );
  }

  revalidatePath(
    `/horarios/${versionId}`,
  );

  revalidatePath(
    "/horarios",
  );

  return successResponse(
    nextLocked
      ? "La clase quedó bloqueada."
      : "La clase quedó desbloqueada.",
  );
}

export async function reoptimizeScheduleAction(
  _previousState,
  formData,
) {
  const versionId =
    getString(
      formData,
      "versionId",
    );

  if (!versionId) {
    return {
      success: false,

      message:
        "No fue posible identificar la versión base.",

      newVersionId:
        null,

      solverStatus:
        null,
    };
  }

  try {
    const {
      school,
      user,
    } =
      await getCurrentSchool();

    const supabase =
      await createClient();

    const {
      data: sourceVersion,
      error:
        sourceVersionError,
    } = await supabase
      .from(
        "schedule_versions",
      )
      .select(`
        id,
        name,
        status,
        academic_period_id
      `)
      .eq("id", versionId)
      .eq(
        "school_id",
        school.id,
      )
      .maybeSingle();

    if (sourceVersionError) {
      logSupabaseError(
        "Error consultando versión base:",
        sourceVersionError,
      );

      return {
        success: false,

        message:
          "No fue posible consultar la versión base.",

        newVersionId:
          null,

        solverStatus:
          null,
      };
    }

    if (!sourceVersion) {
      return {
        success: false,

        message:
          "La versión base no existe.",

        newVersionId:
          null,

        solverStatus:
          null,
      };
    }

    if (
      sourceVersion.status !==
      "draft"
    ) {
      return {
        success: false,

        message:
          "Solamente se puede reoptimizar una versión en borrador.",

        newVersionId:
          null,

        solverStatus:
          null,
      };
    }

    const validation =
      await validateScheduleConfiguration();

    if (
      !validation.canGenerate
    ) {
      return {
        success: false,

        message: `La configuración contiene ${validation.errors.length} errores que impiden reoptimizar.`,

        newVersionId:
          null,

        solverStatus:
          null,
      };
    }

    const {
      activeAcademicPeriod,
      payload,
      lockedEntries,
    } =
      await buildSchedulePayload({
        sourceVersionId:
          versionId,
      });

    if (
      activeAcademicPeriod.id !==
      sourceVersion.academic_period_id
    ) {
      return {
        success: false,

        message:
          "La versión base no pertenece al ciclo escolar activo.",

        newVersionId:
          null,

        solverStatus:
          null,
      };
    }

  const solverResult =
  await solveSchedule(payload, {
    timeoutMs: 30_000,
  });

    if (
      ![
        "optimal",
        "feasible",
      ].includes(
        solverResult.status,
      )
    ) {
      return {
        success: false,

        message:
          solverResult.message ||
          "El solver no encontró una solución válida.",

        newVersionId:
          null,

        solverStatus:
          solverResult.status ??
          null,
      };
    }

    if (
      !Array.isArray(
        solverResult.entries,
      )
    ) {
      return {
        success: false,

        message:
          "El solver devolvió un resultado sin clases.",

        newVersionId:
          null,

        solverStatus:
          solverResult.status,
      };
    }

    const expectedEntries =
      payload.assignments.reduce(
        (
          total,
          assignment,
        ) =>
          total +
          Number(
            assignment.weekly_periods ??
              0,
          ),
        0,
      );

    if (
      solverResult.entries
        .length !==
      expectedEntries
    ) {
      return {
        success: false,

        message: `El solver solamente devolvió ${solverResult.entries.length} de ${expectedEntries} clases.`,

        newVersionId:
          null,

        solverStatus:
          solverResult.status,
      };
    }

    /*
     * Verificamos que todas las clases bloqueadas
     * permanezcan exactamente en la misma posición.
     */
    for (
      const lockedEntry
      of lockedEntries
    ) {
      const matchingEntry =
        solverResult.entries.find(
          (entry) =>
            entry.assignment_id ===
              lockedEntry.assignment_id &&
            entry.occurrence_number ===
              lockedEntry.occurrence_number,
        );

      if (!matchingEntry) {
        return {
          success: false,

          message:
            "El solver no devolvió una de las clases bloqueadas.",

          newVersionId:
            null,

          solverStatus:
            solverResult.status,
        };
      }

      const preserved =
        matchingEntry.day_of_week ===
          lockedEntry.day_of_week &&
        matchingEntry.shift_period_id ===
          lockedEntry.shift_period_id;

      if (!preserved) {
        return {
          success: false,

          message:
            "El solver modificó una posición que debía permanecer bloqueada.",

          newVersionId:
            null,

          solverStatus:
            solverResult.status,
        };
      }
    }

    const versionName =
      `${
        sourceVersion.name ||
        "Horario"
      } · Reoptimización`;

    const newVersion =
      await saveScheduleResult({
        school,

        activeAcademicPeriod,

        solverResult,

        userId: user.id,

        sourceVersionId:
          sourceVersion.id,

        versionName,
      });

    revalidatePath(
      "/horarios",
    );

    revalidatePath(
      `/horarios/${versionId}`,
    );

    revalidatePath(
      `/horarios/${newVersion.id}`,
    );

    revalidatePath(
      "/generador",
    );

    return {
      success: true,

      message:
        lockedEntries.length >
        0
          ? `Nueva versión generada respetando ${lockedEntries.length} clases bloqueadas.`
          : "Nueva versión generada. No había clases bloqueadas.",

      newVersionId:
        newVersion.id,

      solverStatus:
        solverResult.status,
    };
  } catch (error) {
    console.error(
      "Error reoptimizando horario:",
      error,
    );

    return {
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado durante la reoptimización.",

      newVersionId:
        null,

      solverStatus:
        null,
    };
  }
}