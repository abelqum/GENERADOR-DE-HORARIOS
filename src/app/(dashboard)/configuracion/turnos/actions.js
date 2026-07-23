"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import {
  isValidTimeRange,
  timeRangesOverlap,
} from "@/utils/time";

function getString(formData, field) {
  return String(
    formData.get(field) ?? "",
  ).trim();
}

function timeToMinutes(time) {
  if (!time) {
    return null;
  }

  const [hours, minutes] = String(time)
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return null;
  }

  return hours * 60 + minutes;
}
export async function createShiftAction(
  _previousState,
  formData,
) {
  const name = getString(formData, "name");
  const startTime = getString(formData, "startTime");
  const endTime = getString(formData, "endTime");

  if (name.length < 2) {
    return {
      success: false,
      message: "El nombre del turno es obligatorio.",
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

  const { data: existingShifts, error: existingError } =
    await supabase
      .from("shifts")
      .select("id, name, start_time, end_time")
      .eq("school_id", school.id)
      .eq("active", true);

  if (existingError) {
    console.error(
      "Error consultando los turnos existentes:",
      existingError,
    );

    return {
      success: false,
      message: "No fue posible validar los turnos existentes.",
    };
  }

  const overlappingShift = existingShifts?.find((shift) =>
    timeRangesOverlap(
      startTime,
      endTime,
      shift.start_time,
      shift.end_time,
    ),
  );

  if (overlappingShift) {
    return {
      success: false,
      message: `El horario se traslapa con el turno ${overlappingShift.name}.`,
    };
  }

  const { error } = await supabase.from("shifts").insert({
    school_id: school.id,
    name,
    start_time: startTime,
    end_time: endTime,
    active: true,
  });

  if (error) {
    console.error("Error creando turno:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message: "Ya existe un turno con ese nombre.",
      };
    }

    return {
      success: false,
      message: "No fue posible registrar el turno.",
    };
  }

  revalidatePath("/configuracion");
  revalidatePath("/configuracion/turnos");
  revalidatePath("/configuracion/periodos");

  return {
    success: true,
    message: "Turno registrado correctamente.",
  };
}
export async function updateShiftAction(formData) {
  const shiftId = getString(
    formData,
    "shiftId",
  );

  const name = getString(
    formData,
    "name",
  );

  const startTime = getString(
    formData,
    "startTime",
  );

  const endTime = getString(
    formData,
    "endTime",
  );

  const active =
    getString(formData, "active") ===
    "true";

  if (!shiftId) {
    return {
      success: false,
      message:
        "No fue posible identificar el turno.",
    };
  }

  if (name.length < 2) {
    return {
      success: false,
      message:
        "El nombre del turno debe contener al menos dos caracteres.",
    };
  }

  if (!isValidTimeRange(startTime, endTime)) {
    return {
      success: false,
      message:
        "La hora final debe ser posterior a la hora inicial.",
    };
  }

  const { school } =
    await getCurrentSchool();

  const supabase =
    await createClient();

  const {
    data: currentShift,
    error: currentShiftError,
  } = await supabase
    .from("shifts")
    .select(`
      id,
      name,
      start_time,
      end_time,
      active
    `)
    .eq("id", shiftId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (currentShiftError) {
    console.error(
      "Error consultando turno:",
      currentShiftError,
    );

    return {
      success: false,
      message:
        "No fue posible consultar el turno.",
    };
  }

  if (!currentShift) {
    return {
      success: false,
      message:
        "El turno no existe o no pertenece a esta escuela.",
    };
  }

  /*
   * Evitamos nombres duplicados.
   */
  const {
    data: duplicatedShift,
    error: duplicateError,
  } = await supabase
    .from("shifts")
    .select("id")
    .eq("school_id", school.id)
    .ilike("name", name)
    .neq("id", shiftId)
    .maybeSingle();

  if (duplicateError) {
    console.error(
      "Error verificando nombre del turno:",
      duplicateError,
    );

    return {
      success: false,
      message:
        "No fue posible verificar el nombre del turno.",
    };
  }

  if (duplicatedShift) {
    return {
      success: false,
      message:
        "Ya existe otro turno con ese nombre.",
    };
  }

  /*
   * Validamos que no se traslape con otro turno activo.
   * Excluimos el turno que estamos editando.
   */
  const {
    data: otherShifts,
    error: otherShiftsError,
  } = await supabase
    .from("shifts")
    .select(`
      id,
      name,
      start_time,
      end_time
    `)
    .eq("school_id", school.id)
    .eq("active", true)
    .neq("id", shiftId);

  if (otherShiftsError) {
    console.error(
      "Error consultando otros turnos:",
      otherShiftsError,
    );

    return {
      success: false,
      message:
        "No fue posible validar los demás turnos.",
    };
  }

  const overlappingShift =
    (otherShifts ?? []).find((shift) =>
      timeRangesOverlap(
        startTime,
        endTime,
        shift.start_time,
        shift.end_time,
      ),
    );

  if (overlappingShift) {
    return {
      success: false,
      message: `El nuevo horario se traslapa con el turno ${overlappingShift.name}.`,
    };
  }

  /*
   * Las horas ya configuradas deben seguir dentro
   * del rango del turno.
   */
  const {
    data: shiftPeriods,
    error: periodsError,
  } = await supabase
    .from("shift_periods")
    .select(`
      id,
      name,
      start_time,
      end_time,
      active
    `)
    .eq("school_id", school.id)
    .eq("shift_id", shiftId);

  if (periodsError) {
    console.error(
      "Error consultando horas del turno:",
      periodsError,
    );

    return {
      success: false,
      message:
        "No fue posible comprobar las horas del turno.",
    };
  }

  const newStartMinutes =
    timeToMinutes(startTime);

  const newEndMinutes =
    timeToMinutes(endTime);

  const periodOutsideRange =
    (shiftPeriods ?? []).find(
      (period) => {
        const periodStart =
          timeToMinutes(
            period.start_time,
          );

        const periodEnd =
          timeToMinutes(
            period.end_time,
          );

        return (
          periodStart <
            newStartMinutes ||
          periodEnd > newEndMinutes
        );
      },
    );

  if (periodOutsideRange) {
    return {
      success: false,
      message: `${periodOutsideRange.name} queda fuera del nuevo horario del turno. Ajusta primero esa hora o amplía el rango del turno.`,
    };
  }

  const { error } = await supabase
    .from("shifts")
    .update({
      name,
      start_time: startTime,
      end_time: endTime,
      active,
    })
    .eq("id", shiftId)
    .eq("school_id", school.id);

  if (error) {
    console.error(
      "Error actualizando turno:",
      error,
    );

    if (error.code === "23505") {
      return {
        success: false,
        message:
          "Ya existe otro turno con ese nombre.",
      };
    }

    return {
      success: false,
      message:
        "No fue posible actualizar el turno.",
    };
  }

  revalidatePath("/configuracion");
  revalidatePath(
    "/configuracion/turnos",
  );
  revalidatePath(
    "/configuracion/periodos",
  );
  revalidatePath("/grupos");
  revalidatePath("/profesores");
  revalidatePath("/disponibilidad");
  revalidatePath("/asignaciones");
  revalidatePath("/generador");
  revalidatePath("/horarios");

  return {
    success: true,
    message:
      "Turno actualizado correctamente.",
  };
}
export async function toggleShiftAction(formData) {
  const shiftId = getString(formData, "shiftId");
  const nextActive = getString(formData, "nextActive") === "true";

  if (!shiftId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("shifts")
    .update({
      active: nextActive,
    })
    .eq("id", shiftId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error actualizando turno:", error);
    return;
  }

  revalidatePath("/configuracion");
  revalidatePath("/configuracion/turnos");
  revalidatePath("/configuracion/periodos");
}

export async function deleteShiftAction(formData) {
  const shiftId = getString(formData, "shiftId");

  if (!shiftId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { count: periodsCount, error: periodsError },
    { count: groupsCount, error: groupsError },
  ] = await Promise.all([
    supabase
      .from("shift_periods")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("shift_id", shiftId)
      .eq("school_id", school.id),

    supabase
      .from("groups")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("shift_id", shiftId)
      .eq("school_id", school.id),
  ]);

  if (periodsError || groupsError) {
    console.error(
      "Error verificando dependencias del turno:",
      periodsError || groupsError,
    );

    return;
  }

  if ((periodsCount ?? 0) > 0 || (groupsCount ?? 0) > 0) {
    console.error(
      "No se puede eliminar un turno con horas o grupos asociados.",
    );

    return;
  }

  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", shiftId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error eliminando turno:", error);
    return;
  }

  revalidatePath("/configuracion");
  revalidatePath("/configuracion/turnos");
  revalidatePath("/configuracion/periodos");
}