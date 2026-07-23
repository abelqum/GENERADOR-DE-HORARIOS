"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";

function getVersionId(formData) {
  return String(
    formData.get("versionId") ?? "",
  ).trim();
}

async function getVersion({
  supabase,
  schoolId,
  versionId,
}) {
  const { data, error } = await supabase
    .from("schedule_versions")
    .select(`
  id,
  school_id,
  academic_period_id,
  status,
  solver_statistics
`)
    .eq("id", versionId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error) {
    console.error(
      "Error obteniendo versión del horario:",
      error,
    );

    return null;
  }

  return data;
}
export async function publishScheduleVersionAction(
  formData,
) {
  const versionId =
    getVersionId(formData);

  if (!versionId) {
    return {
      success: false,
      message:
        "No fue posible identificar la versión.",
    };
  }

  const { school } =
    await getCurrentSchool();

  const supabase =
    await createClient();

  const version = await getVersion({
    supabase,
    schoolId: school.id,
    versionId,
  });

  if (!version) {
    return {
      success: false,
      message:
        "La versión no existe o no pertenece a esta escuela.",
    };
  }

  if (version.status !== "draft") {
    return {
      success: false,
      message:
        "Solamente se pueden publicar versiones en borrador.",
    };
  }

  const {
    count: entriesCount,
    error: entriesCountError,
  } = await supabase
    .from("schedule_entries")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("school_id", school.id)
    .eq(
      "schedule_version_id",
      version.id,
    );

  if (entriesCountError) {
    console.error(
      "Error comprobando clases de la versión:",
      entriesCountError,
    );

    return {
      success: false,
      message:
        "No fue posible comprobar la integridad del horario.",
    };
  }

  if ((entriesCount ?? 0) === 0) {
    return {
      success: false,
      message:
        "La versión no contiene clases y no puede publicarse.",
    };
  }

  const solverStatistics =
    version.solver_statistics ?? {};

  const expectedEntriesCount =
    Number(
      solverStatistics.scheduled_entries ??
        solverStatistics.total_entries ??
        0,
    );

  if (
    expectedEntriesCount > 0 &&
    entriesCount !==
      expectedEntriesCount
  ) {
    return {
      success: false,
      message: `La versión está incompleta. Se esperaban ${expectedEntriesCount} clases, pero existen ${entriesCount}.`,
    };
  }

  /*
   * Archivamos la versión publicada anterior
   * del mismo ciclo escolar.
   */
  const {
    error: archiveError,
  } = await supabase
    .from("schedule_versions")
    .update({
      status: "archived",
    })
    .eq("school_id", school.id)
    .eq(
      "academic_period_id",
      version.academic_period_id,
    )
    .eq("status", "published")
    .neq("id", version.id);

  if (archiveError) {
    console.error(
      "Error archivando versión anterior:",
      archiveError,
    );

    return {
      success: false,
      message:
        "No fue posible archivar la versión publicada anteriormente.",
    };
  }

  const {
    error: publishError,
  } = await supabase
    .from("schedule_versions")
    .update({
      status: "published",
      published_at:
        new Date().toISOString(),
    })
    .eq("id", version.id)
    .eq("school_id", school.id)
    .eq("status", "draft");

  if (publishError) {
    console.error(
      "Error publicando horario:",
      publishError,
    );

    return {
      success: false,
      message:
        "No fue posible publicar el horario.",
    };
  }

  revalidatePath("/horarios");
  revalidatePath(
    `/horarios/${version.id}`,
  );
  revalidatePath("/generador");
  revalidatePath("/");

  return {
    success: true,
    message:
      "Horario publicado correctamente.",
  };
}

export async function archiveScheduleVersionAction(
  formData,
) {
  const versionId = getVersionId(formData);

  if (!versionId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("schedule_versions")
    .update({
      status: "archived",
    })
    .eq("id", versionId)
    .eq("school_id", school.id)
    .eq("status", "published");

  if (error) {
    console.error(
      "Error archivando horario:",
      error,
    );

    return;
  }

  revalidatePath("/horarios");
  revalidatePath(`/horarios/${versionId}`);
}

export async function restoreScheduleVersionAction(
  formData,
) {
  const versionId = getVersionId(formData);

  if (!versionId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const { error } = await supabase
    .from("schedule_versions")
    .update({
      status: "draft",
      published_at: null,
    })
    .eq("id", versionId)
    .eq("school_id", school.id)
    .eq("status", "archived");

  if (error) {
    console.error(
      "Error restaurando horario:",
      error,
    );

    return;
  }

  revalidatePath("/horarios");
  revalidatePath(`/horarios/${versionId}`);
}

export async function deleteScheduleVersionAction(
  formData,
) {
  const versionId = getVersionId(formData);

  if (!versionId) {
    return;
  }

  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const version = await getVersion({
    supabase,
    schoolId: school.id,
    versionId,
  });

  if (!version) {
    return;
  }

  /*
   * Una versión publicada primero debe archivarse.
   */
  if (version.status === "published") {
    return;
  }

  const { error: entriesError } = await supabase
    .from("schedule_entries")
    .delete()
    .eq("school_id", school.id)
    .eq("schedule_version_id", version.id);

  if (entriesError) {
    console.error(
      "Error eliminando clases del horario:",
      entriesError,
    );

    return;
  }

  const { error: versionError } = await supabase
    .from("schedule_versions")
    .delete()
    .eq("id", version.id)
    .eq("school_id", school.id);

  if (versionError) {
    console.error(
      "Error eliminando versión:",
      versionError,
    );

    return;
  }

  revalidatePath("/horarios");
  revalidatePath("/generador");

  redirect("/horarios");
}