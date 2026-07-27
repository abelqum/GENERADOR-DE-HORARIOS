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

function normalizeOptionalEmail(value) {
  const email = value.trim().toLowerCase();

  return email || null;
}

function normalizeOptionalValue(value) {
  const normalized = value.trim();

  return normalized || null;
}

function isValidEmail(value) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function createTeacherAction(_previousState, formData) {
  const employeeNumber = normalizeOptionalValue(
    getString(formData, "employeeNumber"),
  );

  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");

  const email = normalizeOptionalEmail(getString(formData, "email"));

  const phone = normalizeOptionalValue(getString(formData, "phone"));

  const maxWeeklyPeriods = getPositiveInteger(formData, "maxWeeklyPeriods");

  const maxDailyPeriods = getPositiveInteger(formData, "maxDailyPeriods");

  const notes = normalizeOptionalValue(getString(formData, "notes"));

  if (firstName.length < 1) {
    return {
      success: false,
      message: "Escribe el nombre del profesor.",
    };
  }

  if (lastName.length < 1) {
    return {
      success: false,
      message: "Escribe los apellidos del profesor.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      message: "El correo electrónico no es válido.",
    };
  }

  if (!maxWeeklyPeriods) {
    return {
      success: false,
      message: "La carga semanal debe ser mayor que cero.",
    };
  }

  if (!maxDailyPeriods) {
    return {
      success: false,
      message: "La carga diaria debe ser mayor que cero.",
    };
  }

  if (maxDailyPeriods > maxWeeklyPeriods) {
    return {
      success: false,
      message: "La carga diaria no puede superar la carga semanal.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase.from("teachers").insert({
    school_id: school.id,
    employee_number: employeeNumber,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    max_weekly_periods: maxWeeklyPeriods,
    max_daily_periods: maxDailyPeriods,
    notes,
    active: true,
  });

  if (error) {
    console.error("Error creando profesor:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message: "Ya existe un profesor con ese número de empleado o correo.",
      };
    }

    return {
      success: false,
      message: "No fue posible registrar al profesor.",
    };
  }

  revalidatePath("/profesores");
  revalidatePath("/asignaciones");
  revalidatePath("/disponibilidad");
  revalidatePath("/");

  return {
    success: true,
    message: "Profesor registrado correctamente.",
  };
}

export async function toggleTeacherAction(formData) {
  const teacherId = getString(formData, "teacherId");

  const nextActive = getString(formData, "nextActive") === "true";

  if (!teacherId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("teachers")
    .update({
      active: nextActive,
    })
    .eq("id", teacherId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error actualizando profesor:", error);
    return;
  }

  revalidatePath("/profesores");
  revalidatePath("/asignaciones");
  revalidatePath("/disponibilidad");
  revalidatePath("/");
}

export async function deleteTeacherAction(formData) {
  const teacherId = getString(formData, "teacherId");

  if (!teacherId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { count: assignmentsCount, error: assignmentsError },
    { count: availabilityCount, error: availabilityError },
    { count: entriesCount, error: entriesError },
  ] = await Promise.all([
    supabase
      .from("teaching_assignments")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("teacher_id", teacherId),

    supabase
      .from("teacher_availability")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("teacher_id", teacherId),

    supabase
      .from("schedule_entries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("teacher_id", teacherId),
  ]);

  if (assignmentsError || availabilityError || entriesError) {
    console.error(
      "Error verificando dependencias del profesor:",
      assignmentsError || availabilityError || entriesError,
    );

    return;
  }

  if (
    (assignmentsCount ?? 0) > 0 ||
    (availabilityCount ?? 0) > 0 ||
    (entriesCount ?? 0) > 0
  ) {
    console.error("No se puede eliminar un profesor que ya está en uso.");

    return;
  }

  const { error } = await supabase
    .from("teachers")
    .delete()
    .eq("id", teacherId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error eliminando profesor:", error);
    return;
  }

  revalidatePath("/profesores");
  revalidatePath("/asignaciones");
  revalidatePath("/disponibilidad");
  revalidatePath("/");
}

export async function updateTeacherAction(_previousState, formData) {
  const teacherId = getString(formData, "teacherId");

  const employeeNumber = normalizeOptionalValue(
    getString(formData, "employeeNumber"),
  );

  const firstName = getString(formData, "firstName");

  const lastName = getString(formData, "lastName");

  const email = normalizeOptionalEmail(getString(formData, "email"));

  const phone = normalizeOptionalValue(getString(formData, "phone"));

  const notes = normalizeOptionalValue(getString(formData, "notes"));

  const maxWeeklyPeriods =
    getPositiveInteger(formData, "maxWeeklyPeriods") ??
    getPositiveInteger(formData, "maxWeeklyHours");

  const maxDailyPeriods =
    getPositiveInteger(formData, "maxDailyPeriods") ??
    getPositiveInteger(formData, "maxDailyHours");

  const active = getString(formData, "active") === "true";

  if (!teacherId) {
    return {
      success: false,
      message: "No fue posible identificar al profesor.",
    };
  }

  if (!firstName) {
    return {
      success: false,
      message: "Escribe el nombre del profesor.",
    };
  }

  if (!lastName) {
    return {
      success: false,
      message: "Escribe los apellidos del profesor.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      message: "El correo electrónico no es válido.",
    };
  }

  if (!maxWeeklyPeriods) {
    return {
      success: false,
      message: "El máximo semanal debe ser mayor que cero.",
    };
  }

  if (!maxDailyPeriods) {
    return {
      success: false,
      message: "El máximo diario debe ser mayor que cero.",
    };
  }

  if (maxDailyPeriods > maxWeeklyPeriods) {
    return {
      success: false,
      message: "El máximo diario no puede superar el máximo semanal.",
    };
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { error } = await supabase
    .from("teachers")
    .update({
      employee_number: employeeNumber,

      first_name: firstName,

      last_name: lastName,

      email,
      phone,
      notes,

      max_weekly_periods: maxWeeklyPeriods,

      max_daily_periods: maxDailyPeriods,

      active,

      updated_at: new Date().toISOString(),
    })
    .eq("id", teacherId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error actualizando profesor:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message: "Ya existe otro profesor con ese número de empleado o correo.",
      };
    }

    return {
      success: false,
      message: "No fue posible actualizar al profesor.",
    };
  }

  revalidatePath("/profesores");

  revalidatePath(`/profesores/${teacherId}/configuracion`);

  revalidatePath("/asignaciones");
  revalidatePath("/disponibilidad");
  revalidatePath("/generador");
  revalidatePath("/");

  return {
    success: true,
    message: "Profesor actualizado correctamente.",
  };
}
