"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import {
  AVAILABILITY_TYPES,
} from "@/constants/availability";
import { SCHOOL_DAYS } from "@/constants/days";

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function getInteger(formData, field) {
  const value = Number.parseInt(
    getString(formData, field),
    10,
  );

  return Number.isInteger(value) ? value : null;
}

function getAvailabilityType(value) {
  return AVAILABILITY_TYPES[value] || null;
}

function isValidSchoolDay(dayOfWeek) {
  return SCHOOL_DAYS.some(
    (day) => day.value === dayOfWeek,
  );
}

export async function saveTeacherAvailabilityAction(
  _previousState,
  formData,
) {
  const teacherId = getString(formData, "teacherId");
  const shiftPeriodId = getString(
    formData,
    "shiftPeriodId",
  );

  const dayOfWeek = getInteger(
    formData,
    "dayOfWeek",
  );

  const availabilityTypeValue = getString(
    formData,
    "availabilityType",
  );

  const notes = getString(formData, "notes");

  const availabilityConfiguration =
    getAvailabilityType(availabilityTypeValue);

  if (!teacherId) {
    return {
      success: false,
      message: "Selecciona un profesor.",
    };
  }

  if (!shiftPeriodId) {
    return {
      success: false,
      message: "Selecciona una hora.",
    };
  }

  if (
    !dayOfWeek ||
    !isValidSchoolDay(dayOfWeek)
  ) {
    return {
      success: false,
      message: "El día seleccionado no es válido.",
    };
  }

  if (!availabilityConfiguration) {
    return {
      success: false,
      message:
        "El tipo de disponibilidad no es válido.",
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
      "Error obteniendo ciclo escolar:",
      periodError,
    );

    return {
      success: false,
      message:
        "No fue posible obtener el ciclo escolar activo.",
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
    { data: teacher, error: teacherError },
    {
      data: shiftPeriod,
      error: shiftPeriodError,
    },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, active")
      .eq("id", teacherId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("shift_periods")
      .select(`
        id,
        shift_id,
        period_type,
        active
      `)
      .eq("id", shiftPeriodId)
      .eq("school_id", school.id)
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
    shiftPeriodError ||
    !shiftPeriod?.active
  ) {
    return {
      success: false,
      message:
        "El periodo seleccionado no está disponible.",
    };
  }

  if (shiftPeriod.period_type !== "class") {
    return {
      success: false,
      message:
        "La disponibilidad solamente puede configurarse en horas de clase.",
    };
  }

  const {
    data: teacherShift,
    error: teacherShiftError,
  } = await supabase
    .from("teacher_shifts")
    .select("id")
    .eq("school_id", school.id)
    .eq("teacher_id", teacherId)
    .eq("shift_id", shiftPeriod.shift_id)
    .maybeSingle();

  if (teacherShiftError || !teacherShift) {
    return {
      success: false,
      message:
        "El profesor no está autorizado para trabajar en el turno de esta hora.",
    };
  }

  const { error } = await supabase
    .from("teacher_availability")
    .upsert(
      {
        school_id: school.id,
        academic_period_id:
          activeAcademicPeriod.id,
        teacher_id: teacherId,
        day_of_week: dayOfWeek,
        shift_period_id: shiftPeriodId,
        availability_type:
          availabilityConfiguration.value,
        weight:
          availabilityConfiguration.weight,
        notes: notes || null,
      },
      {
        onConflict:
          "academic_period_id,teacher_id,day_of_week,shift_period_id",
      },
    );

  if (error) {
    console.error(
      "Error guardando disponibilidad:",
      error,
    );

    return {
      success: false,
      message:
        "No fue posible guardar la disponibilidad.",
    };
  }

  revalidatePath("/disponibilidad");

  return {
    success: true,
    message: "Disponibilidad actualizada.",
  };
}

export async function saveAvailabilityCellAction(
  formData,
) {
  const teacherId = getString(
    formData,
    "teacherId",
  );

  const shiftPeriodId = getString(
    formData,
    "shiftPeriodId",
  );

  const dayOfWeek = getInteger(
    formData,
    "dayOfWeek",
  );

  const availabilityTypeValue =
    getString(
      formData,
      "availabilityType",
    );

  const availabilityConfiguration =
    getAvailabilityType(
      availabilityTypeValue,
    );

  if (!teacherId) {
    return {
      success: false,
      message:
        "No se identificó al profesor.",
    };
  }

  if (!shiftPeriodId) {
    return {
      success: false,
      message:
        "No se identificó la hora.",
    };
  }

  if (
    !dayOfWeek ||
    !isValidSchoolDay(dayOfWeek)
  ) {
    return {
      success: false,
      message:
        "El día seleccionado no es válido.",
    };
  }

  if (!availabilityConfiguration) {
    return {
      success: false,
      message:
        "El tipo de disponibilidad no es válido.",
    };
  }

  const { school } =
    await getCurrentSchool();

  const supabase =
    await createClient();

  const {
    data: activeAcademicPeriod,
    error: academicPeriodError,
  } = await supabase
    .from("academic_periods")
    .select("id")
    .eq("school_id", school.id)
    .eq("active", true)
    .maybeSingle();

  if (
    academicPeriodError ||
    !activeAcademicPeriod
  ) {
    return {
      success: false,
      message:
        "No existe un ciclo escolar activo.",
    };
  }

  const [
    {
      data: teacher,
      error: teacherError,
    },
    {
      data: shiftPeriod,
      error: shiftPeriodError,
    },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, active")
      .eq("id", teacherId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("shift_periods")
      .select(`
        id,
        shift_id,
        period_type,
        active
      `)
      .eq("id", shiftPeriodId)
      .eq("school_id", school.id)
      .maybeSingle(),
  ]);

  if (
    teacherError ||
    !teacher?.active
  ) {
    return {
      success: false,
      message:
        "El profesor no está disponible.",
    };
  }

  if (
    shiftPeriodError ||
    !shiftPeriod?.active
  ) {
    return {
      success: false,
      message:
        "La hora seleccionada no está activa.",
    };
  }

  if (
    shiftPeriod.period_type !==
    "class"
  ) {
    return {
      success: false,
      message:
        "Solo puedes configurar horas de clase.",
    };
  }

  const {
    data: teacherShift,
    error: teacherShiftError,
  } = await supabase
    .from("teacher_shifts")
    .select("id")
    .eq("school_id", school.id)
    .eq("teacher_id", teacherId)
    .eq(
      "shift_id",
      shiftPeriod.shift_id,
    )
    .maybeSingle();

  if (
    teacherShiftError ||
    !teacherShift
  ) {
    return {
      success: false,
      message:
        "El profesor no está autorizado para ese turno.",
    };
  }

  const { error } = await supabase
    .from("teacher_availability")
    .upsert(
      {
        school_id: school.id,
        academic_period_id:
          activeAcademicPeriod.id,
        teacher_id: teacherId,
        day_of_week: dayOfWeek,
        shift_period_id:
          shiftPeriodId,
        availability_type:
          availabilityConfiguration.value,
        weight:
          availabilityConfiguration.weight,
      },
      {
        onConflict:
          "academic_period_id,teacher_id,day_of_week,shift_period_id",
      },
    );

  if (error) {
    console.error(
      "Error guardando celda de disponibilidad:",
      error,
    );

    return {
      success: false,
      message:
        "No fue posible guardar la disponibilidad.",
    };
  }

  revalidatePath("/disponibilidad");

  return {
    success: true,
    message:
      "Disponibilidad actualizada.",
  };
}

export async function fillTeacherAvailabilityAction(
  _previousState,
  formData,
) {
  const teacherId = getString(formData, "teacherId");

  const availabilityTypeValue = getString(
    formData,
    "availabilityType",
  );

  const availabilityConfiguration =
    getAvailabilityType(availabilityTypeValue);

  if (!teacherId) {
    return {
      success: false,
      message: "Selecciona un profesor.",
    };
  }

  if (!availabilityConfiguration) {
    return {
      success: false,
      message:
        "Selecciona un tipo de disponibilidad.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: activeAcademicPeriod } =
    await supabase
      .from("academic_periods")
      .select("id")
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle();

  if (!activeAcademicPeriod) {
    return {
      success: false,
      message:
        "No existe un ciclo escolar activo.",
    };
  }

  const { data: teacherShifts, error: shiftsError } =
    await supabase
      .from("teacher_shifts")
      .select(`
        shift_id,
        shift:shifts (
          id,
          shift_periods (
            id,
            period_type,
            active
          )
        )
      `)
      .eq("school_id", school.id)
      .eq("teacher_id", teacherId);

  if (shiftsError) {
    console.error(
      "Error obteniendo turnos del profesor:",
      shiftsError,
    );

    return {
      success: false,
      message:
        "No fue posible obtener los turnos del profesor.",
    };
  }

  const classPeriods = (teacherShifts ?? [])
    .flatMap(
      (teacherShift) =>
        teacherShift.shift?.shift_periods ?? [],
    )
    .filter(
      (period) =>
        period.active &&
        period.period_type === "class",
    );

  if (classPeriods.length === 0) {
    return {
      success: false,
      message:
        "El profesor no tiene horas de clase disponibles.",
    };
  }

  const records = [];

  for (const day of SCHOOL_DAYS) {
    for (const period of classPeriods) {
      records.push({
        school_id: school.id,
        academic_period_id:
          activeAcademicPeriod.id,
        teacher_id: teacherId,
        day_of_week: day.value,
        shift_period_id: period.id,
        availability_type:
          availabilityConfiguration.value,
        weight:
          availabilityConfiguration.weight,
      });
    }
  }

  const { error } = await supabase
    .from("teacher_availability")
    .upsert(records, {
      onConflict:
        "academic_period_id,teacher_id,day_of_week,shift_period_id",
    });

  if (error) {
    console.error(
      "Error llenando disponibilidad:",
      error,
    );

    return {
      success: false,
      message:
        "No fue posible actualizar toda la disponibilidad.",
    };
  }

  revalidatePath("/disponibilidad");

  return {
    success: true,
    message:
      "Disponibilidad general actualizada correctamente.",
  };
}
export async function fillFilteredTeacherAvailabilityAction(
  _previousState,
  formData,
) {
  const teacherId = getString(
    formData,
    "teacherId",
  );

  const shiftId = getString(
    formData,
    "shiftId",
  );

  const dayValue = getString(
    formData,
    "dayOfWeek",
  );

  const availabilityTypeValue =
    getString(
      formData,
      "availabilityType",
    );

  const availabilityConfiguration =
    getAvailabilityType(
      availabilityTypeValue,
    );

  const dayOfWeek =
    dayValue === "all"
      ? null
      : Number.parseInt(dayValue, 10);

  if (!teacherId) {
    return {
      success: false,
      message:
        "Selecciona un profesor.",
    };
  }

  if (!availabilityConfiguration) {
    return {
      success: false,
      message:
        "Selecciona un tipo de disponibilidad válido.",
    };
  }

  if (
    dayValue !== "all" &&
    (
      !Number.isInteger(dayOfWeek) ||
      !isValidSchoolDay(dayOfWeek)
    )
  ) {
    return {
      success: false,
      message:
        "Selecciona un día válido.",
    };
  }

  const { school } =
    await getCurrentSchool();

  const supabase =
    await createClient();

  const {
    data: activeAcademicPeriod,
    error: academicPeriodError,
  } = await supabase
    .from("academic_periods")
    .select("id")
    .eq("school_id", school.id)
    .eq("active", true)
    .maybeSingle();

  if (
    academicPeriodError ||
    !activeAcademicPeriod
  ) {
    return {
      success: false,
      message:
        "No existe un ciclo escolar activo.",
    };
  }

  const {
    data: teacher,
    error: teacherError,
  } = await supabase
    .from("teachers")
    .select("id, active")
    .eq("id", teacherId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (teacherError || !teacher?.active) {
    return {
      success: false,
      message:
        "El profesor no está disponible.",
    };
  }

  let teacherShiftsQuery = supabase
    .from("teacher_shifts")
    .select(`
      shift_id,
      shift:shifts (
        id,
        name,
        shift_periods (
          id,
          period_type,
          active
        )
      )
    `)
    .eq("school_id", school.id)
    .eq("teacher_id", teacherId);

  if (shiftId !== "all") {
    teacherShiftsQuery =
      teacherShiftsQuery.eq(
        "shift_id",
        shiftId,
      );
  }

  const {
    data: teacherShifts,
    error: shiftsError,
  } = await teacherShiftsQuery;

  if (shiftsError) {
    console.error(
      "Error obteniendo turnos del profesor:",
      shiftsError,
    );

    return {
      success: false,
      message:
        "No fue posible consultar los turnos del profesor.",
    };
  }

  const classPeriods = (
    teacherShifts ?? []
  )
    .flatMap((teacherShift) => {
      const shift = Array.isArray(
        teacherShift.shift,
      )
        ? teacherShift.shift[0]
        : teacherShift.shift;

      return (
        shift?.shift_periods ?? []
      );
    })
    .filter(
      (period) =>
        period.active &&
        period.period_type === "class",
    );

  if (classPeriods.length === 0) {
    return {
      success: false,
      message:
        "No se encontraron horas de clase para la selección.",
    };
  }

  const selectedDays =
    dayValue === "all"
      ? SCHOOL_DAYS.map(
          (day) => day.value,
        )
      : [dayOfWeek];

  const records = [];

  for (const selectedDay of selectedDays) {
    for (const period of classPeriods) {
      records.push({
        school_id: school.id,
        academic_period_id:
          activeAcademicPeriod.id,
        teacher_id: teacherId,
        day_of_week: selectedDay,
        shift_period_id: period.id,
        availability_type:
          availabilityConfiguration.value,
        weight:
          availabilityConfiguration.weight,
      });
    }
  }

  const { error } = await supabase
    .from("teacher_availability")
    .upsert(records, {
      onConflict:
        "academic_period_id,teacher_id,day_of_week,shift_period_id",
    });

  if (error) {
    console.error(
      "Error aplicando disponibilidad masiva:",
      error,
    );

    return {
      success: false,
      message:
        "No fue posible aplicar la disponibilidad.",
    };
  }

  revalidatePath("/disponibilidad");

  const selectedDayName =
    dayValue === "all"
      ? "toda la semana"
      : SCHOOL_DAYS.find(
          (day) =>
            day.value === dayOfWeek,
        )?.name ?? "el día seleccionado";

  const selectedShiftName =
    shiftId === "all"
      ? "todos los turnos"
      : (
          teacherShifts ?? []
        )
          .map((teacherShift) =>
            Array.isArray(
              teacherShift.shift,
            )
              ? teacherShift.shift[0]
              : teacherShift.shift,
          )
          .find(
            (shift) =>
              shift?.id === shiftId,
          )?.name ??
        "el turno seleccionado";

  return {
    success: true,
    message: `Disponibilidad aplicada a ${selectedDayName} en ${selectedShiftName}.`,
  };
}
export async function clearTeacherAvailabilityAction(
  formData,
) {
  const teacherId = getString(formData, "teacherId");

  if (!teacherId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { data: activeAcademicPeriod } =
    await supabase
      .from("academic_periods")
      .select("id")
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle();

  if (!activeAcademicPeriod) {
    return;
  }

  const { error } = await supabase
    .from("teacher_availability")
    .delete()
    .eq("school_id", school.id)
    .eq(
      "academic_period_id",
      activeAcademicPeriod.id,
    )
    .eq("teacher_id", teacherId);

  if (error) {
    console.error(
      "Error eliminando disponibilidad:",
      error,
    );

    return;
  }

  revalidatePath("/disponibilidad");
}