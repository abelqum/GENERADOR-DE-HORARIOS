import { createClient } from "@/lib/supabase/server";

function buildVersionName(
  activeAcademicPeriod,
  createdAt,
) {
  const formattedDate =
    new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Mexico_City",
    }).format(createdAt);

  return `${activeAcademicPeriod.name} · ${formattedDate}`;
}
export async function saveScheduleResult({
  school,
  activeAcademicPeriod,
  solverResult,
  userId,
  sourceVersionId = null,
  versionName = null,
}) {
  if (!school?.id) {
    throw new Error(
      "No se identificó la escuela.",
    );
  }

  if (!activeAcademicPeriod?.id) {
    throw new Error(
      "No se identificó el ciclo escolar.",
    );
  }

  if (
    !solverResult ||
    !Array.isArray(
      solverResult.entries,
    )
  ) {
    throw new Error(
      "El resultado del solver no contiene clases válidas.",
    );
  }

  if (
    solverResult.entries.length === 0
  ) {
    throw new Error(
      "El solver no devolvió ninguna clase para guardar.",
    );
  }

  const supabase =
    await createClient();

  const createdAt =
    new Date();

  const versionPayload = {
    school_id: school.id,

    academic_period_id:
      activeAcademicPeriod.id,

    name:
      versionName ||
      buildVersionName(
        activeAcademicPeriod,
        createdAt,
      ),

    status: "draft",

    solver_status:
      solverResult.status,

    objective_value:
      solverResult.statistics
        ?.objective_value ?? null,

    solver_statistics:
      solverResult.statistics ?? {},

    warnings:
      solverResult.warnings ?? [],

    generated_by: userId,

    source_version_id:
      sourceVersionId,
  };

  const {
    data: scheduleVersion,
    error: versionError,
  } = await supabase
    .from("schedule_versions")
    .insert(versionPayload)
    .select(`
      id,
      name,
      status,
      solver_status,
      created_at
    `)
    .single();

  if (versionError) {
  console.error(
    "Error creando versión del horario:",
    {
      message: versionError.message,
      details: versionError.details,
      hint: versionError.hint,
      code: versionError.code,
    },
  );

  throw new Error(
    [
      "No fue posible crear la versión del horario.",
      versionError.message
        ? `Error: ${versionError.message}`
        : null,
      versionError.details
        ? `Detalles: ${versionError.details}`
        : null,
      versionError.hint
        ? `Sugerencia: ${versionError.hint}`
        : null,
      versionError.code
        ? `Código: ${versionError.code}`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

  const entriesPayload =
    solverResult.entries.map(
      (entry, index) => ({
        school_id: school.id,

        schedule_version_id:
          scheduleVersion.id,

        teaching_assignment_id:
          entry.assignment_id,

        occurrence_number:
          Number.isInteger(
            entry.occurrence_number,
          )
            ? entry.occurrence_number
            : index + 1,

        day_of_week:
          entry.day_of_week,

        shift_period_id:
          entry.shift_period_id,

        locked:
          Boolean(entry.locked),
      }),
    );

  /*
   * Validación básica antes de insertar.
   */
  const invalidEntry =
    entriesPayload.find(
      (entry) =>
        !entry.teaching_assignment_id ||
        !entry.shift_period_id ||
        !Number.isInteger(
          entry.day_of_week,
        ),
    );

  if (invalidEntry) {
    await supabase
      .from("schedule_versions")
      .delete()
      .eq("id", scheduleVersion.id)
      .eq("school_id", school.id);

    throw new Error(
      "El solver devolvió una clase incompleta. La versión no fue guardada.",
    );
  }

  const { error: entriesError } =
    await supabase
      .from("schedule_entries")
      .insert(entriesPayload);

  if (entriesError) {
    console.error(
      "Error guardando clases del horario:",
      entriesError,
    );

    /*
     * Limpieza compensatoria:
     * eliminamos la versión para no dejarla vacía.
     *
     * Si schedule_entries tiene ON DELETE CASCADE,
     * cualquier entrada parcial también será eliminada.
     */
    const { error: cleanupError } =
      await supabase
        .from("schedule_versions")
        .delete()
        .eq("id", scheduleVersion.id)
        .eq("school_id", school.id);

    if (cleanupError) {
      console.error(
        "Error limpiando versión incompleta:",
        cleanupError,
      );
    }

    throw new Error(
      "No fue posible guardar las clases generadas. La versión incompleta fue descartada.",
    );
  }

  /*
   * Comprobamos que Supabase haya guardado exactamente
   * la cantidad esperada.
   */
  const {
    count: storedEntriesCount,
    error: countError,
  } = await supabase
    .from("schedule_entries")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("school_id", school.id)
    .eq(
      "schedule_version_id",
      scheduleVersion.id,
    );

  if (countError) {
    console.error(
      "Error verificando clases guardadas:",
      countError,
    );

    await supabase
      .from("schedule_versions")
      .delete()
      .eq("id", scheduleVersion.id)
      .eq("school_id", school.id);

    throw new Error(
      "No fue posible verificar el horario guardado.",
    );
  }

  if (
    storedEntriesCount !==
    entriesPayload.length
  ) {
    await supabase
      .from("schedule_versions")
      .delete()
      .eq("id", scheduleVersion.id)
      .eq("school_id", school.id);

    throw new Error(
      `Se esperaban ${entriesPayload.length} clases, pero solamente se guardaron ${storedEntriesCount ?? 0}. La versión incompleta fue eliminada.`,
    );
  }

  return {
    ...scheduleVersion,

    entriesCount:
      storedEntriesCount,
  };
}