"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import {
  isValidTimeRange,
  timeRangesOverlap,
  timeToMinutes,
} from "@/utils/time";

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

const allowedPeriodTypes = [
  "class",
  "recess",
  "unavailable",
];

export async function createShiftPeriodAction(
  _previousState,
  formData,
) {
  const shiftId = getString(formData, "shiftId");
  const name = getString(formData, "name");
  const startTime = getString(formData, "startTime");
  const endTime = getString(formData, "endTime");
  const periodType = getString(formData, "periodType");

  if (!shiftId) {
    return {
      success: false,
      message: "Selecciona un turno.",
    };
  }

  if (name.length < 2) {
    return {
      success: false,
      message: "Escribe el nombre del periodo.",
    };
  }

  if (!allowedPeriodTypes.includes(periodType)) {
    return {
      success: false,
      message: "El tipo de periodo no es válido.",
    };
  }

  if (!isValidTimeRange(startTime, endTime)) {
    return {
      success: false,
      message:
        "La hora final debe ser posterior a la hora inicial.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: shift, error: shiftError } = await supabase
    .from("shifts")
    .select("id, name, start_time, end_time")
    .eq("id", shiftId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (shiftError || !shift) {
    return {
      success: false,
      message: "El turno seleccionado no existe.",
    };
  }

  const periodStart = timeToMinutes(startTime);
  const periodEnd = timeToMinutes(endTime);
  const shiftStart = timeToMinutes(shift.start_time);
  const shiftEnd = timeToMinutes(shift.end_time);

  if (
    periodStart < shiftStart ||
    periodEnd > shiftEnd
  ) {
    return {
      success: false,
      message: `El periodo debe encontrarse dentro del horario del turno ${shift.name}.`,
    };
  }

  const { data: existingPeriods, error: periodsError } =
    await supabase
      .from("shift_periods")
      .select(`
        id,
        name,
        start_time,
        end_time,
        period_number
      `)
      .eq("shift_id", shiftId)
      .eq("school_id", school.id)
      .eq("active", true);

  if (periodsError) {
    console.error(
      "Error consultando horas:",
      periodsError,
    );

    return {
      success: false,
      message: "No fue posible validar las horas.",
    };
  }

  const overlappingPeriod = existingPeriods?.find((period) =>
    timeRangesOverlap(
      startTime,
      endTime,
      period.start_time,
      period.end_time,
    ),
  );

  if (overlappingPeriod) {
    return {
      success: false,
      message: `El horario se traslapa con ${overlappingPeriod.name}.`,
    };
  }

  const nextPeriodNumber =
    existingPeriods?.length > 0
      ? Math.max(
          ...existingPeriods.map(
            (period) => period.period_number,
          ),
        ) + 1
      : 1;

  const { error } = await supabase
    .from("shift_periods")
    .insert({
      school_id: school.id,
      shift_id: shiftId,
      period_number: nextPeriodNumber,
      name,
      start_time: startTime,
      end_time: endTime,
      period_type: periodType,
      active: true,
    });

  if (error) {
    console.error("Error creando periodo:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message:
          "Ya existe un periodo con ese número dentro del turno.",
      };
    }

    return {
      success: false,
      message: "No fue posible registrar el periodo.",
    };
  }

  revalidatePath("/configuracion");
  revalidatePath("/configuracion/turnos");
  revalidatePath("/configuracion/periodos");

  return {
    success: true,
    message: "Periodo registrado correctamente.",
  };
}
export async function updateShiftPeriodAction(formData) {
  const periodId = getString(formData, "periodId");
  const name = getString(formData, "name");
  const startTime = getString(formData, "startTime");
  const endTime = getString(formData, "endTime");
  const periodType = getString(formData, "periodType");
  const active =
    getString(formData, "active") === "true";

  const periodNumber = Number.parseInt(
    getString(formData, "periodNumber"),
    10,
  );

  if (!periodId) {
    return {
      success: false,
      message:
        "No fue posible identificar la hora.",
    };
  }

  if (name.length < 2) {
    return {
      success: false,
      message:
        "Escribe un nombre válido para la hora.",
    };
  }

  if (
    !Number.isInteger(periodNumber) ||
    periodNumber < 1
  ) {
    return {
      success: false,
      message:
        "El número de orden debe ser mayor que cero.",
    };
  }

  if (!allowedPeriodTypes.includes(periodType)) {
    return {
      success: false,
      message:
        "El tipo de hora seleccionado no es válido.",
    };
  }

  if (!isValidTimeRange(startTime, endTime)) {
    return {
      success: false,
      message:
        "La hora final debe ser posterior a la hora inicial.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const {
    data: currentPeriod,
    error: currentPeriodError,
  } = await supabase
    .from("shift_periods")
    .select(`
      id,
      shift_id,
      period_number,
      name,
      start_time,
      end_time,
      period_type,
      active
    `)
    .eq("id", periodId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (currentPeriodError) {
    console.error(
      "Error consultando la hora:",
      currentPeriodError,
    );

    return {
      success: false,
      message:
        "No fue posible consultar la hora.",
    };
  }

  if (!currentPeriod) {
    return {
      success: false,
      message:
        "La hora no existe o no pertenece a esta escuela.",
    };
  }

  const {
    data: shift,
    error: shiftError,
  } = await supabase
    .from("shifts")
    .select(`
      id,
      name,
      start_time,
      end_time
    `)
    .eq("id", currentPeriod.shift_id)
    .eq("school_id", school.id)
    .maybeSingle();

  if (shiftError || !shift) {
    return {
      success: false,
      message:
        "El turno relacionado con esta hora no existe.",
    };
  }

  const periodStart =
    timeToMinutes(startTime);

  const periodEnd =
    timeToMinutes(endTime);

  const shiftStart =
    timeToMinutes(shift.start_time);

  const shiftEnd =
    timeToMinutes(shift.end_time);

  if (
    periodStart < shiftStart ||
    periodEnd > shiftEnd
  ) {
    return {
      success: false,
      message: `La hora debe encontrarse dentro del turno ${shift.name}.`,
    };
  }

  /*
   * Verificamos que el nuevo horario no se traslape
   * con otra hora del mismo turno.
   */
  const {
    data: otherPeriods,
    error: periodsError,
  } = await supabase
    .from("shift_periods")
    .select(`
      id,
      name,
      period_number,
      start_time,
      end_time
    `)
    .eq("school_id", school.id)
    .eq("shift_id", currentPeriod.shift_id)
    .neq("id", periodId);

  if (periodsError) {
    console.error(
      "Error consultando otras horas:",
      periodsError,
    );

    return {
      success: false,
      message:
        "No fue posible validar las demás horas del turno.",
    };
  }

  const duplicatedNumber =
    otherPeriods?.find(
      (period) =>
        period.period_number ===
        periodNumber,
    );

  if (duplicatedNumber) {
    return {
      success: false,
      message: `Ya existe otra hora con el orden ${periodNumber}.`,
    };
  }

  const overlappingPeriod =
    otherPeriods?.find((period) =>
      timeRangesOverlap(
        startTime,
        endTime,
        period.start_time,
        period.end_time,
      ),
    );

  if (overlappingPeriod) {
    return {
      success: false,
      message: `El horario se traslapa con ${overlappingPeriod.name}.`,
    };
  }

  const { error } = await supabase
    .from("shift_periods")
    .update({
      period_number: periodNumber,
      name,
      start_time: startTime,
      end_time: endTime,
      period_type: periodType,
      active,
    })
    .eq("id", periodId)
    .eq("school_id", school.id);

  if (error) {
    console.error(
      "Error actualizando la hora:",
      error,
    );

    if (error.code === "23505") {
      return {
        success: false,
        message:
          "Ya existe otra hora con el mismo número dentro del turno.",
      };
    }

    return {
      success: false,
      message:
        "No fue posible actualizar la hora.",
    };
  }

  revalidatePath("/configuracion");
  revalidatePath("/configuracion/turnos");
  revalidatePath("/configuracion/periodos");
  revalidatePath("/disponibilidad");
  revalidatePath("/generador");
  revalidatePath("/horarios");

  return {
    success: true,
    message:
      "Hora actualizada correctamente.",
  };
}
export async function deleteShiftPeriodAction(formData) {
  const periodId = getString(formData, "periodId");

  if (!periodId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { count: availabilityCount },
    { count: entriesCount },
  ] = await Promise.all([
    supabase
      .from("teacher_availability")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("shift_period_id", periodId)
      .eq("school_id", school.id),

    supabase
      .from("schedule_entries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("shift_period_id", periodId)
      .eq("school_id", school.id),
  ]);

  if (
    (availabilityCount ?? 0) > 0 ||
    (entriesCount ?? 0) > 0
  ) {
    console.error(
      "No se puede eliminar un periodo que ya está en uso.",
    );

    return;
  }

  const { error } = await supabase
    .from("shift_periods")
    .delete()
    .eq("id", periodId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error eliminando periodo:", error);
    return;
  }

  revalidatePath("/configuracion/turnos");
  revalidatePath("/configuracion/periodos");
}