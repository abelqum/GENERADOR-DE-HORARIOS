"use server";

import { revalidatePath } from "next/cache";

import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function getInteger(formData, field) {
  const value = Number.parseInt(getString(formData, field), 10);

  return Number.isInteger(value) ? value : null;
}

function successResponse({ message, label }) {
  return {
    success: true,
    message,
    label,
  };
}

function errorResponse(message) {
  return {
    success: false,
    message,
    label: null,
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

export async function saveTeacherSlotLabelAction(formData) {
  const versionId = getString(formData, "versionId");

  const teacherId = getString(formData, "teacherId");

  const shiftPeriodId = getString(formData, "shiftPeriodId");

  const dayOfWeek = getInteger(formData, "dayOfWeek");

  const requestedLabel = getString(formData, "label");

  if (!versionId || !teacherId || !shiftPeriodId || dayOfWeek === null) {
    return errorResponse(
      "La información de la hora seleccionada está incompleta.",
    );
  }

  if (dayOfWeek < 1 || dayOfWeek > 5) {
    return errorResponse("El día seleccionado no es válido.");
  }

  if (!["free", "service"].includes(requestedLabel)) {
    return errorResponse("La etiqueta seleccionada no es válida.");
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  /*
   * Verificamos que la versión pertenezca
   * a la escuela actual.
   */
  const { data: version, error: versionError } = await supabase
    .from("schedule_versions")
    .select(
      `
      id,
      school_id,
      status
    `,
    )
    .eq("id", versionId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (versionError) {
    logSupabaseError("Error verificando versión:", versionError);

    return errorResponse("No fue posible verificar la versión del horario.");
  }

  if (!version) {
    return errorResponse("La versión del horario no existe.");
  }

  /*
   * La anotación puede modificarse aunque
   * la versión esté publicada, porque no
   * altera ninguna clase del horario.
   */

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select(
      `
      id,
      school_id
    `,
    )
    .eq("id", teacherId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (teacherError) {
    logSupabaseError("Error verificando profesor:", teacherError);

    return errorResponse("No fue posible verificar al profesor.");
  }

  if (!teacher) {
    return errorResponse("El profesor seleccionado no existe.");
  }

  const { data: period, error: periodError } = await supabase
    .from("shift_periods")
    .select(
      `
      id,
      school_id,
      period_type
    `,
    )
    .eq("id", shiftPeriodId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (periodError) {
    logSupabaseError("Error verificando hora:", periodError);

    return errorResponse("No fue posible verificar la hora seleccionada.");
  }

  if (!period) {
    return errorResponse("La hora seleccionada no existe.");
  }

  if (period.period_type !== "class") {
    return errorResponse(
      "Solamente se puede marcar Servicio dentro de una hora de clase.",
    );
  }

  /*
   * La celda debe seguir estando libre.
   * No permitimos guardar Servicio encima
   * de una clase académica.
   */
  const { data: existingClass, error: existingClassError } = await supabase
    .from("schedule_entries")
    .select("id")
    .eq("school_id", school.id)
    .eq("schedule_version_id", versionId)
    .eq("teacher_id", teacherId)
    .eq("day_of_week", dayOfWeek)
    .eq("shift_period_id", shiftPeriodId)
    .maybeSingle();

  if (existingClassError) {
    logSupabaseError(
      "Error verificando la celda del profesor:",
      existingClassError,
    );

    return errorResponse("No fue posible comprobar si la hora está libre.");
  }

  if (existingClass) {
    return errorResponse(
      "Esta hora ya contiene una clase y no puede marcarse como Servicio.",
    );
  }

  /*
   * Seleccionar Libre significa eliminar
   * la etiqueta. La ausencia de registro
   * se interpreta como una hora libre normal.
   */
  if (requestedLabel === "free") {
    const { error: deleteError } = await supabase
      .from("schedule_teacher_slot_labels")
      .delete()
      .eq("school_id", school.id)
      .eq("schedule_version_id", versionId)
      .eq("teacher_id", teacherId)
      .eq("day_of_week", dayOfWeek)
      .eq("shift_period_id", shiftPeriodId);

    if (deleteError) {
      logSupabaseError("Error eliminando etiqueta de Servicio:", deleteError);

      return errorResponse("No fue posible marcar esta hora como Libre.");
    }

    revalidatePath(`/horarios/${versionId}`);

    return successResponse({
      message: "La hora quedó marcada como Libre.",

      label: "free",
    });
  }

  /*
   * Seleccionar Servicio crea o actualiza
   * la etiqueta de esta celda.
   */
  const { error: upsertError } = await supabase
    .from("schedule_teacher_slot_labels")
    .upsert(
      {
        school_id: school.id,

        schedule_version_id: versionId,

        teacher_id: teacherId,

        day_of_week: dayOfWeek,

        shift_period_id: shiftPeriodId,

        label: "service",

        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          "schedule_version_id,teacher_id,day_of_week,shift_period_id",
      },
    );

  if (upsertError) {
    logSupabaseError("Error guardando etiqueta de Servicio:", upsertError);

    return errorResponse("No fue posible marcar esta hora como Servicio.");
  }

  revalidatePath(`/horarios/${versionId}`);

  return successResponse({
    message: "La hora quedó marcada como Servicio.",

    label: "service",
  });
}
