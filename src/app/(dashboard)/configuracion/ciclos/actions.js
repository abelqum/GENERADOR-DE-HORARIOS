"use server";

import { revalidatePath } from "next/cache";

import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

function getString(formData, field) {
  return String(formData.get(field) ?? "").trim();
}

function isValidDate(value) {
  if (!value) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
}

function revalidateAcademicPeriods() {
  revalidatePath("/configuracion");
  revalidatePath("/configuracion/ciclos");
  revalidatePath("/", "layout");
}

function validateAcademicPeriod({ name, startDate, endDate }) {
  if (name.length < 3) {
    return {
      success: false,
      message: "El nombre debe contener al menos 3 caracteres.",
    };
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return {
      success: false,
      message: "Captura fechas válidas.",
    };
  }

  if (endDate < startDate) {
    return {
      success: false,
      message: "La fecha final no puede ser anterior a la fecha inicial.",
    };
  }

  return null;
}

async function deactivateCurrentAcademicPeriod({
  supabase,
  schoolId,
  excludedAcademicPeriodId = null,
}) {
  let query = supabase
    .from("academic_periods")
    .update({
      active: false,
    })
    .eq("school_id", schoolId)
    .eq("active", true);

  if (excludedAcademicPeriodId) {
    query = query.neq("id", excludedAcademicPeriodId);
  }

  const { error } = await query;

  return error;
}

export async function createAcademicPeriodAction(_previousState, formData) {
  const name = getString(formData, "name");
  const startDate = getString(formData, "startDate");
  const endDate = getString(formData, "endDate");
  const active = formData.get("active") === "on";

  const validationError = validateAcademicPeriod({
    name,
    startDate,
    endDate,
  });

  if (validationError) {
    return validationError;
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  if (active) {
    const deactivateError = await deactivateCurrentAcademicPeriod({
      supabase,
      schoolId: school.id,
    });

    if (deactivateError) {
      console.error("Error desactivando ciclos anteriores:", deactivateError);

      return {
        success: false,
        message: "No fue posible actualizar el ciclo escolar activo.",
      };
    }
  }

  const { error } = await supabase.from("academic_periods").insert({
    school_id: school.id,
    name,
    start_date: startDate,
    end_date: endDate,
    active,
  });

  if (error) {
    console.error("Error creando ciclo escolar:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message: "Ya existe un ciclo escolar con ese nombre.",
      };
    }

    return {
      success: false,
      message: "No fue posible crear el ciclo escolar.",
    };
  }

  revalidateAcademicPeriods();

  return {
    success: true,
    message: "Ciclo escolar registrado correctamente.",
  };
}

export async function updateAcademicPeriodAction(formData) {
  const academicPeriodId = getString(formData, "academicPeriodId");

  const name = getString(formData, "name");

  const startDate = getString(formData, "startDate");

  const endDate = getString(formData, "endDate");

  if (!academicPeriodId) {
    return {
      success: false,
      message: "No se recibió el ciclo escolar que se quiere editar.",
    };
  }

  const validationError = validateAcademicPeriod({
    name,
    startDate,
    endDate,
  });

  if (validationError) {
    return validationError;
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: academicPeriod, error: findError } = await supabase
    .from("academic_periods")
    .select("id, active")
    .eq("id", academicPeriodId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (findError || !academicPeriod) {
    console.error("Error buscando ciclo escolar:", findError);

    return {
      success: false,
      message: "No se encontró el ciclo escolar.",
    };
  }

  const { error } = await supabase
    .from("academic_periods")
    .update({
      name,
      start_date: startDate,
      end_date: endDate,
    })
    .eq("id", academicPeriodId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error actualizando ciclo escolar:", error);

    if (error.code === "23505") {
      return {
        success: false,
        message: "Ya existe otro ciclo escolar con ese nombre.",
      };
    }

    return {
      success: false,
      message: "No fue posible actualizar el ciclo escolar.",
    };
  }

  revalidateAcademicPeriods();

  return {
    success: true,
    message: "Ciclo escolar actualizado correctamente.",
  };
}

export async function setActiveAcademicPeriodAction(formData) {
  const academicPeriodId = getString(formData, "academicPeriodId");

  if (!academicPeriodId) {
    return {
      success: false,
      message: "No se recibió el ciclo escolar.",
    };
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: academicPeriod, error: findError } = await supabase
    .from("academic_periods")
    .select("id")
    .eq("id", academicPeriodId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (findError || !academicPeriod) {
    return {
      success: false,
      message: "No se encontró el ciclo escolar.",
    };
  }

  const deactivateError = await deactivateCurrentAcademicPeriod({
    supabase,
    schoolId: school.id,
    excludedAcademicPeriodId: academicPeriodId,
  });

  if (deactivateError) {
    console.error("Error desactivando ciclo anterior:", deactivateError);

    return {
      success: false,
      message: "No fue posible desactivar el ciclo anterior.",
    };
  }

  const { error } = await supabase
    .from("academic_periods")
    .update({
      active: true,
    })
    .eq("id", academicPeriodId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error activando ciclo escolar:", error);

    return {
      success: false,
      message: "No fue posible activar el ciclo escolar.",
    };
  }

  revalidateAcademicPeriods();

  return {
    success: true,
    message: "El ciclo escolar fue activado.",
  };
}

export async function deleteAcademicPeriodAction(formData) {
  const academicPeriodId = getString(formData, "academicPeriodId");

  if (!academicPeriodId) {
    return {
      success: false,
      message: "No se recibió el ciclo escolar que se quiere eliminar.",
    };
  }

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: academicPeriod, error: findError } = await supabase
    .from("academic_periods")
    .select("id, name, active")
    .eq("id", academicPeriodId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (findError || !academicPeriod) {
    console.error("Error buscando ciclo escolar:", findError);

    return {
      success: false,
      message: "No se encontró el ciclo escolar.",
    };
  }

  if (academicPeriod.active) {
    return {
      success: false,
      message:
        "No puedes eliminar el ciclo escolar activo. Activa otro ciclo primero.",
    };
  }

  const { error } = await supabase
    .from("academic_periods")
    .delete()
    .eq("id", academicPeriodId)
    .eq("school_id", school.id);

  if (error) {
    console.error("Error eliminando ciclo escolar:", error);

    if (error.code === "23503") {
      return {
        success: false,
        message:
          "Este ciclo no se puede eliminar porque tiene grupos, asignaciones u horarios relacionados.",
      };
    }

    return {
      success: false,
      message: "No fue posible eliminar el ciclo escolar.",
    };
  }

  revalidateAcademicPeriods();

  return {
    success: true,
    message: "Ciclo escolar eliminado correctamente.",
  };
}
