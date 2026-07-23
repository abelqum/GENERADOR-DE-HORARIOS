"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function getPositiveInteger(formData, field) {
  const value = Number.parseInt(getString(formData, field), 10);

  return Number.isInteger(value) && value > 0
    ? value
    : null;
}

export async function saveTeacherSubjectAction(
  _previousState,
  formData,
) {
  const teacherId = getString(formData, "teacherId");
  const subjectId = getString(formData, "subjectId");

  const priority = getPositiveInteger(
    formData,
    "priority",
  );

  const isPrimary =
    formData.get("isPrimary") === "on";

  if (!teacherId || !subjectId) {
    return {
      success: false,
      message: "Selecciona una materia.",
    };
  }

  if (!priority) {
    return {
      success: false,
      message: "La prioridad debe ser mayor que cero.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { data: teacher },
    { data: subject },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("id")
      .eq("id", teacherId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("subjects")
      .select("id, active")
      .eq("id", subjectId)
      .eq("school_id", school.id)
      .maybeSingle(),
  ]);

  if (!teacher) {
    return {
      success: false,
      message: "El profesor no existe.",
    };
  }

  if (!subject?.active) {
    return {
      success: false,
      message: "La materia no está disponible.",
    };
  }

  const { error } = await supabase
    .from("teacher_subjects")
    .upsert(
      {
        school_id: school.id,
        teacher_id: teacherId,
        subject_id: subjectId,
        priority,
        is_primary: isPrimary,
      },
      {
        onConflict: "teacher_id,subject_id",
      },
    );

  if (error) {
    console.error(
      "Error guardando materia del profesor:",
      error,
    );

    return {
      success: false,
      message:
        "No fue posible guardar la materia del profesor.",
    };
  }

  revalidatePath("/profesores");
  revalidatePath(
    `/profesores/${teacherId}/configuracion`,
  );
  revalidatePath("/asignaciones");

  return {
    success: true,
    message: "Materia asignada correctamente.",
  };
}

export async function deleteTeacherSubjectAction(formData) {
  const teacherSubjectId = getString(
    formData,
    "teacherSubjectId",
  );

  const teacherId = getString(formData, "teacherId");

  if (!teacherSubjectId || !teacherId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("teacher_subjects")
    .delete()
    .eq("id", teacherSubjectId)
    .eq("school_id", school.id)
    .eq("teacher_id", teacherId);

  if (error) {
    console.error(
      "Error eliminando materia del profesor:",
      error,
    );

    return;
  }

  revalidatePath("/profesores");
  revalidatePath(
    `/profesores/${teacherId}/configuracion`,
  );
  revalidatePath("/asignaciones");
}

export async function saveTeacherShiftAction(
  _previousState,
  formData,
) {
  const teacherId = getString(formData, "teacherId");
  const shiftId = getString(formData, "shiftId");

  const maxWeeklyPeriods = getPositiveInteger(
    formData,
    "maxWeeklyPeriods",
  );

  if (!teacherId || !shiftId) {
    return {
      success: false,
      message: "Selecciona un turno.",
    };
  }

  if (!maxWeeklyPeriods) {
    return {
      success: false,
      message:
        "El máximo semanal del turno debe ser mayor que cero.",
    };
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const [
    { data: teacher },
    { data: shift },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, max_weekly_periods")
      .eq("id", teacherId)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("shifts")
      .select("id, active")
      .eq("id", shiftId)
      .eq("school_id", school.id)
      .maybeSingle(),
  ]);

  if (!teacher) {
    return {
      success: false,
      message: "El profesor no existe.",
    };
  }

  if (!shift?.active) {
    return {
      success: false,
      message: "El turno no está disponible.",
    };
  }

  if (maxWeeklyPeriods > teacher.max_weekly_periods) {
    return {
      success: false,
      message:
        "La carga del turno no puede superar la carga semanal total del profesor.",
    };
  }

  const { error } = await supabase
    .from("teacher_shifts")
    .upsert(
      {
        school_id: school.id,
        teacher_id: teacherId,
        shift_id: shiftId,
        max_weekly_periods: maxWeeklyPeriods,
      },
      {
        onConflict: "teacher_id,shift_id",
      },
    );

  if (error) {
    console.error(
      "Error guardando turno del profesor:",
      error,
    );

    return {
      success: false,
      message:
        "No fue posible guardar el turno del profesor.",
    };
  }

  revalidatePath("/profesores");
  revalidatePath(
    `/profesores/${teacherId}/configuracion`,
  );
  revalidatePath("/asignaciones");
  revalidatePath("/disponibilidad");

  return {
    success: true,
    message: "Turno asignado correctamente.",
  };
}

export async function deleteTeacherShiftAction(formData) {
  const teacherShiftId = getString(
    formData,
    "teacherShiftId",
  );

  const teacherId = getString(formData, "teacherId");

  if (!teacherShiftId || !teacherId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("teacher_shifts")
    .delete()
    .eq("id", teacherShiftId)
    .eq("school_id", school.id)
    .eq("teacher_id", teacherId);

  if (error) {
    console.error(
      "Error eliminando turno del profesor:",
      error,
    );

    return;
  }

  revalidatePath("/profesores");
  revalidatePath(
    `/profesores/${teacherId}/configuracion`,
  );
  revalidatePath("/asignaciones");
  revalidatePath("/disponibilidad");
}

export async function returnToTeachersAction() {
  redirect("/profesores");
}