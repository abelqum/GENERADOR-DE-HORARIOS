"use server";

import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
}

function getStringValue(school, key) {
  const value = school?.[key];

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function findDirectorName(school) {
  if (!school) {
    return "";
  }

  /*
   * Primero se revisan los nombres de columna
   * más comunes.
   */
  const preferredKeys = [
    "director_name",
    "directora_name",
    "director_full_name",
    "directora_full_name",
    "principal_name",
    "principal_full_name",
    "nombre_director",
    "nombre_directora",
    "nombre_del_director",
    "nombre_de_la_directora",
    "director",
    "directora",
    "principal",
  ];

  for (const key of preferredKeys) {
    const value = getStringValue(school, key);

    if (value) {
      return value;
    }
  }

  /*
   * Después se detecta automáticamente cualquier
   * columna cuyo nombre incluya:
   *
   * director / directora / principal
   *
   * junto con:
   *
   * name / nombre.
   */
  for (const [originalKey, originalValue] of Object.entries(school)) {
    if (typeof originalValue !== "string") {
      continue;
    }

    const value = originalValue.trim();

    if (!value) {
      continue;
    }

    const key = normalizeKey(originalKey);

    const referencesDirector =
      key.includes("director") ||
      key.includes("directora") ||
      key.includes("principal");

    const referencesName =
      key.includes("name") ||
      key.includes("nombre") ||
      key === "director" ||
      key === "directora" ||
      key === "principal";

    if (referencesDirector && referencesName) {
      return value;
    }
  }

  return "";
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

export async function getSchoolDirectorNameAction() {
  try {
    const { school } = await getCurrentSchool();

    const supabase = await createClient();

    /*
     * Se consulta la fila completa porque
     * getCurrentSchool puede no seleccionar
     * todavía el campo de la directora.
     */
    const { data: schoolDetails, error: schoolError } = await supabase
      .from("schools")
      .select("*")
      .eq("id", school.id)
      .maybeSingle();

    if (schoolError) {
      logSupabaseError("Error obteniendo datos de la escuela:", schoolError);

      return {
        success: false,

        directorName: "",

        message: "No fue posible consultar el nombre de la directora.",
      };
    }

    if (!schoolDetails) {
      return {
        success: false,

        directorName: "",

        message: "No se encontró la información de la escuela.",
      };
    }

    const directorName = findDirectorName(schoolDetails);

    if (!directorName) {
      console.error(
        "No se encontró una columna con el nombre de la directora.",
        {
          availableColumns: Object.keys(schoolDetails),
        },
      );

      return {
        success: false,

        directorName: "",

        message:
          "No se encontró el nombre de la directora en la configuración de la escuela.",
      };
    }

    return {
      success: true,

      directorName,

      message: "Nombre de la directora obtenido correctamente.",
    };
  } catch (error) {
    console.error("Error obteniendo nombre de la directora:", error);

    return {
      success: false,

      directorName: "",

      message:
        error instanceof Error
          ? error.message
          : "Ocurrió un error al consultar la directora.",
    };
  }
}
