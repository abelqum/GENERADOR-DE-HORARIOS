"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

const WORKSHOP_PERIODS = 3;
const MIN_DAY = 1;
const MAX_DAY = 5;

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function getDayOfWeek(formData) {
  const value = Number.parseInt(getString(formData, "dayOfWeek"), 10);

  return Number.isInteger(value) ? value : null;
}

function getPeriodIds(formData) {
  const rawValue = getString(formData, "periodIds");

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return [
      ...new Set(
        parsedValue.map((value) => String(value ?? "").trim()).filter(Boolean),
      ),
    ];
  } catch {
    return [];
  }
}

function revalidateWorkshopPages() {
  revalidatePath("/");
  revalidatePath("/grupos");
  revalidatePath("/generador");
  revalidatePath("/horarios");
}

async function getActivePeriodAndGroup({ supabase, schoolId, groupId }) {
  const [
    { data: activeAcademicPeriod, error: academicPeriodError },
    { data: group, error: groupError },
  ] = await Promise.all([
    supabase
      .from("academic_periods")
      .select("id, name")
      .eq("school_id", schoolId)
      .eq("active", true)
      .maybeSingle(),

    supabase
      .from("groups")
      .select(
        `
        id,
        name,
        school_id,
        academic_period_id,
        shift_id,
        active
      `,
      )
      .eq("id", groupId)
      .eq("school_id", schoolId)
      .maybeSingle(),
  ]);

  if (academicPeriodError) {
    console.error(
      "Error consultando ciclo escolar activo:",
      academicPeriodError,
    );

    return {
      success: false,
      message: "No fue posible consultar el ciclo escolar activo.",
      activeAcademicPeriod: null,
      group: null,
    };
  }

  if (!activeAcademicPeriod) {
    return {
      success: false,
      message: "Primero debes configurar un ciclo escolar activo.",
      activeAcademicPeriod: null,
      group: null,
    };
  }

  if (groupError) {
    console.error("Error consultando grupo:", groupError);

    return {
      success: false,
      message: "No fue posible consultar el grupo.",
      activeAcademicPeriod: null,
      group: null,
    };
  }

  if (!group) {
    return {
      success: false,
      message: "El grupo no existe o no pertenece a esta escuela.",
      activeAcademicPeriod: null,
      group: null,
    };
  }

  if (group.academic_period_id !== activeAcademicPeriod.id) {
    return {
      success: false,
      message: "El grupo no pertenece al ciclo escolar activo.",
      activeAcademicPeriod: null,
      group: null,
    };
  }

  if (!group.shift_id) {
    return {
      success: false,
      message: "El grupo no tiene un turno configurado.",
      activeAcademicPeriod: null,
      group: null,
    };
  }

  return {
    success: true,
    message: "",
    activeAcademicPeriod,
    group,
  };
}

async function getValidatedWorkshopPeriods({ supabase, group, periodIds }) {
  const { data: allShiftPeriods, error: shiftPeriodsError } = await supabase
    .from("shift_periods")
    .select(
      `
      id,
      shift_id,
      period_number,
      name,
      start_time,
      end_time,
      period_type,
      active
    `,
    )
    .eq("shift_id", group.shift_id)
    .eq("active", true)
    .order("period_number", {
      ascending: true,
    });

  if (shiftPeriodsError) {
    console.error("Error consultando horas del turno:", shiftPeriodsError);

    return {
      success: false,
      message: "No fue posible consultar las horas del turno.",
      periods: [],
    };
  }

  const orderedShiftPeriods = allShiftPeriods ?? [];

  const selectedPeriodSet = new Set(periodIds);

  const selectedPeriods = orderedShiftPeriods.filter((period) =>
    selectedPeriodSet.has(period.id),
  );

  if (selectedPeriods.length !== WORKSHOP_PERIODS) {
    return {
      success: false,
      message: "Debes seleccionar exactamente tres horas para el taller.",
      periods: [],
    };
  }

  if (selectedPeriods.some((period) => period.shift_id !== group.shift_id)) {
    return {
      success: false,
      message: "Todas las horas deben pertenecer al turno del grupo.",
      periods: [],
    };
  }

  if (
    selectedPeriods.some(
      (period) => !period.active || period.period_type !== "class",
    )
  ) {
    return {
      success: false,
      message: "El taller solamente puede ocupar horas de clase activas.",
      periods: [],
    };
  }

  const selectedIndexes = selectedPeriods
    .map((period) =>
      orderedShiftPeriods.findIndex(
        (shiftPeriod) => shiftPeriod.id === period.id,
      ),
    )
    .sort((firstIndex, secondIndex) => firstIndex - secondIndex);

  const areConsecutive =
    selectedIndexes.length === 3 &&
    selectedIndexes[1] === selectedIndexes[0] + 1 &&
    selectedIndexes[2] === selectedIndexes[1] + 1;

  if (!areConsecutive) {
    return {
      success: false,
      message:
        "Las tres horas del taller deben ser consecutivas y no pueden atravesar un receso.",
      periods: [],
    };
  }

  return {
    success: true,
    message: "",
    periods: selectedPeriods,
  };
}

async function restorePreviousWorkshop({ supabase, previousPeriods }) {
  if (!previousPeriods.length) {
    return;
  }

  const restorationPayload = previousPeriods.map((period) => ({
    id: period.id,
    block_id: period.block_id,
    school_id: period.school_id,
    academic_period_id: period.academic_period_id,
    group_id: period.group_id,
    day_of_week: period.day_of_week,
    shift_period_id: period.shift_period_id,
    slot_order: period.slot_order,
    activity_type: period.activity_type,
    label: period.label,
    color: period.color,
  }));

  const { error } = await supabase
    .from("group_fixed_periods")
    .insert(restorationPayload);

  if (error) {
    console.error("No fue posible restaurar el taller anterior:", error);
  }
}

export async function saveGroupFixedWorkshopAction(formData) {
  const groupId = getString(formData, "groupId");

  const dayOfWeek = getDayOfWeek(formData);

  const periodIds = getPeriodIds(formData);

  if (!groupId) {
    return {
      success: false,
      message: "No fue posible identificar el grupo.",
    };
  }

  if (!dayOfWeek || dayOfWeek < MIN_DAY || dayOfWeek > MAX_DAY) {
    return {
      success: false,
      message: "Selecciona un día válido para el taller.",
    };
  }

  if (periodIds.length !== WORKSHOP_PERIODS) {
    return {
      success: false,
      message: "Selecciona exactamente tres horas para el taller.",
    };
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const groupResult = await getActivePeriodAndGroup({
    supabase,
    schoolId: school.id,
    groupId,
  });

  if (!groupResult.success) {
    return {
      success: false,
      message: groupResult.message,
    };
  }

  const { group, activeAcademicPeriod } = groupResult;

  const periodsResult = await getValidatedWorkshopPeriods({
    supabase,
    group,
    periodIds,
  });

  if (!periodsResult.success) {
    return {
      success: false,
      message: periodsResult.message,
    };
  }

  const { data: previousPeriods, error: previousPeriodsError } = await supabase
    .from("group_fixed_periods")
    .select(
      `
      id,
      block_id,
      school_id,
      academic_period_id,
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
    .eq("academic_period_id", activeAcademicPeriod.id)
    .eq("group_id", group.id)
    .eq("activity_type", "workshop")
    .order("slot_order", {
      ascending: true,
    });

  if (previousPeriodsError) {
    console.error("Error consultando taller anterior:", previousPeriodsError);

    return {
      success: false,
      message: "No fue posible consultar la configuración anterior del taller.",
    };
  }

  const { error: deletePreviousError } = await supabase
    .from("group_fixed_periods")
    .delete()
    .eq("school_id", school.id)
    .eq("academic_period_id", activeAcademicPeriod.id)
    .eq("group_id", group.id)
    .eq("activity_type", "workshop");

  if (deletePreviousError) {
    console.error("Error eliminando taller anterior:", deletePreviousError);

    return {
      success: false,
      message: "No fue posible reemplazar el taller anterior.",
    };
  }

  const blockId = randomUUID();

  const workshopPayload = periodsResult.periods.map((period, index) => ({
    block_id: blockId,
    school_id: school.id,
    academic_period_id: activeAcademicPeriod.id,
    group_id: group.id,
    day_of_week: dayOfWeek,
    shift_period_id: period.id,
    slot_order: index + 1,
    activity_type: "workshop",
    label: "Taller",
    color: "#f59e0b",
  }));

  const { error: insertError } = await supabase
    .from("group_fixed_periods")
    .insert(workshopPayload);

  if (insertError) {
    console.error("Error guardando taller fijo:", insertError);

    await restorePreviousWorkshop({
      supabase,
      previousPeriods: previousPeriods ?? [],
    });

    if (insertError.code === "23505") {
      return {
        success: false,
        message: "El grupo ya tiene una actividad fija en una de esas horas.",
      };
    }

    return {
      success: false,
      message: "No fue posible guardar el taller fijo.",
    };
  }

  revalidateWorkshopPages();

  return {
    success: true,
    message: `El taller fijo de ${group.name} fue guardado correctamente.`,
  };
}

export async function deleteGroupFixedWorkshopAction(formData) {
  const groupId = getString(formData, "groupId");

  if (!groupId) {
    return {
      success: false,
      message: "No fue posible identificar el grupo.",
    };
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const groupResult = await getActivePeriodAndGroup({
    supabase,
    schoolId: school.id,
    groupId,
  });

  if (!groupResult.success) {
    return {
      success: false,
      message: groupResult.message,
    };
  }

  const { group, activeAcademicPeriod } = groupResult;

  const { data: deletedPeriods, error } = await supabase
    .from("group_fixed_periods")
    .delete()
    .eq("school_id", school.id)
    .eq("academic_period_id", activeAcademicPeriod.id)
    .eq("group_id", group.id)
    .eq("activity_type", "workshop")
    .select("id");

  if (error) {
    console.error("Error eliminando taller fijo:", error);

    return {
      success: false,
      message: "No fue posible eliminar el taller fijo.",
    };
  }

  if (!deletedPeriods?.length) {
    return {
      success: false,
      message: "El grupo no tenía un taller fijo configurado.",
    };
  }

  revalidateWorkshopPages();

  return {
    success: true,
    message: `El taller fijo de ${group.name} fue eliminado.`,
  };
}
