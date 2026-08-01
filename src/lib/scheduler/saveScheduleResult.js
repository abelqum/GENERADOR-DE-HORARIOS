import { createClient } from "@/lib/supabase/server";

const INSERT_CHUNK_SIZE = 250;

function buildVersionName(activeAcademicPeriod, createdAt) {
  const formattedDate = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(createdAt);

  return `${activeAcademicPeriod.name} · ` + formattedDate;
}

function splitIntoChunks(values, chunkSize = INSERT_CHUNK_SIZE) {
  const chunks = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
}

function getSupabaseErrorMessage(error, fallbackMessage) {
  if (!error) {
    return fallbackMessage;
  }

  return [
    fallbackMessage,

    error.message ? `Error: ${error.message}` : null,

    error.details ? `Detalles: ${error.details}` : null,

    error.hint ? `Sugerencia: ${error.hint}` : null,

    error.code ? `Código: ${error.code}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

async function insertInChunks({ supabase, table, rows }) {
  if (!Array.isArray(rows)) {
    throw new Error(`Las filas de ${table} no son válidas.`);
  }

  if (rows.length === 0) {
    return;
  }

  const chunks = splitIntoChunks(rows);

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];

    const { error } = await supabase.from(table).insert(chunk);

    if (error) {
      console.error(
        `Error insertando bloque ${index + 1} de ${chunks.length} en ${table}:`,
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      );

      throw error;
    }
  }
}

async function cleanupIncompleteVersion({ supabase, schoolId, versionId }) {
  if (!versionId) {
    return;
  }

  /*
   * Primero eliminamos los talleres
   * asociados a la versión incompleta.
   */
  const { error: fixedEntriesDeleteError } = await supabase
    .from("schedule_fixed_entries")
    .delete()
    .eq("schedule_version_id", versionId)
    .eq("school_id", schoolId);

  if (fixedEntriesDeleteError) {
    console.error(
      "Error eliminando talleres de versión incompleta:",
      fixedEntriesDeleteError,
    );
  }

  /*
   * Después eliminamos las clases.
   */
  const { error: entriesDeleteError } = await supabase
    .from("schedule_entries")
    .delete()
    .eq("schedule_version_id", versionId)
    .eq("school_id", schoolId);

  if (entriesDeleteError) {
    console.error(
      "Error eliminando clases de versión incompleta:",
      entriesDeleteError,
    );
  }

  /*
   * Finalmente eliminamos la cabecera
   * de la versión.
   */
  const { error: versionDeleteError } = await supabase
    .from("schedule_versions")
    .delete()
    .eq("id", versionId)
    .eq("school_id", schoolId);

  if (versionDeleteError) {
    console.error("Error eliminando versión incompleta:", versionDeleteError);
  }
}

function validateSolverEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("El solver no devolvió clases para guardar.");
  }

  const invalidEntry = entries.find(
    (entry) =>
      !entry ||
      !entry.assignment_id ||
      !entry.group_id ||
      !entry.subject_id ||
      !entry.teacher_id ||
      !entry.shift_period_id ||
      !Number.isInteger(entry.day_of_week),
  );

  if (invalidEntry) {
    console.error("Entrada inválida devuelta por el solver:", invalidEntry);

    throw new Error("El solver devolvió una clase con información incompleta.");
  }
}

function validateFixedGroupSlots(fixedGroupSlots) {
  if (!Array.isArray(fixedGroupSlots) || fixedGroupSlots.length === 0) {
    throw new Error("No se recibieron los talleres fijos de los grupos.");
  }

  const invalidSlot = fixedGroupSlots.find(
    (fixedSlot) =>
      !fixedSlot ||
      !fixedSlot.id ||
      !fixedSlot.block_id ||
      !fixedSlot.group_id ||
      !fixedSlot.shift_period_id ||
      !Number.isInteger(fixedSlot.day_of_week) ||
      !Number.isInteger(fixedSlot.slot_order),
  );

  if (invalidSlot) {
    console.error("Taller fijo inválido:", invalidSlot);

    throw new Error(
      "Uno de los talleres fijos contiene información incompleta.",
    );
  }
}

export async function saveScheduleResult({
  school,
  activeAcademicPeriod,
  solverResult,
  fixedGroupSlots = [],
  sourceVersionId = null,
  versionName = null,
}) {
  if (!school?.id) {
    throw new Error("No se identificó la escuela.");
  }

  if (!activeAcademicPeriod?.id) {
    throw new Error("No se identificó el ciclo escolar activo.");
  }

  if (!solverResult || typeof solverResult !== "object") {
    throw new Error("No se recibió un resultado válido del solver.");
  }

  if (!["optimal", "feasible"].includes(solverResult.status)) {
    throw new Error("El resultado del solver no representa un horario válido.");
  }

  validateSolverEntries(solverResult.entries);

  validateFixedGroupSlots(fixedGroupSlots);

  const supabase = await createClient();

  const createdAt = new Date();

  let scheduleVersionId = null;

  try {
    /*
     * 1. Crear la cabecera de la versión.
     */
    const { data: scheduleVersion, error: versionError } = await supabase
      .from("schedule_versions")
      .insert({
        school_id: school.id,

        academic_period_id: activeAcademicPeriod.id,

        source_version_id: sourceVersionId || null,

        name: versionName || buildVersionName(activeAcademicPeriod, createdAt),

        status: "draft",

        solver_status: solverResult.status,

        objective_value: Number.isFinite(
          solverResult.statistics?.objective_value,
        )
          ? solverResult.statistics.objective_value
          : null,

        solver_statistics: solverResult.statistics ?? {},

        warnings: Array.isArray(solverResult.warnings)
          ? solverResult.warnings
          : [],
      })
      .select(
        `
        id,
        name,
        status,
        solver_status,
        created_at
      `,
      )
      .single();

    if (versionError || !scheduleVersion) {
      console.error("Error creando versión del horario:", versionError);

      throw new Error(
        getSupabaseErrorMessage(
          versionError,
          "No fue posible crear la versión del horario.",
        ),
      );
    }

    scheduleVersionId = scheduleVersion.id;

    /*
     * 2. Preparar las clases normales.
     *
     * IMPORTANTE:
     *
     * La tabla schedule_entries de tu
     * proyecto NO tiene:
     *
     * - academic_period_id
     * - preference_score
     *
     * Por eso no se envían.
     */
    const entriesPayload = solverResult.entries.map((entry, index) => ({
      school_id: school.id,

      schedule_version_id: scheduleVersion.id,

      teaching_assignment_id: entry.assignment_id,

      group_id: entry.group_id,

      subject_id: entry.subject_id,

      teacher_id: entry.teacher_id,

      day_of_week: entry.day_of_week,

      shift_period_id: entry.shift_period_id,

      occurrence_number: Number.isInteger(entry.occurrence_number)
        ? entry.occurrence_number
        : index + 1,

      locked: Boolean(entry.locked),
    }));

    console.info("Guardando clases normales:", {
      versionId: scheduleVersion.id,
      total: entriesPayload.length,
      sample: entriesPayload[0],
    });

    try {
      await insertInChunks({
        supabase,
        table: "schedule_entries",
        rows: entriesPayload,
      });
    } catch (entriesError) {
      throw new Error(
        getSupabaseErrorMessage(
          entriesError,
          "No fue posible guardar las clases generadas.",
        ),
      );
    }

    /*
     * 3. Preparar los talleres fijos.
     */
    const fixedEntriesPayload = fixedGroupSlots.map((fixedSlot) => ({
      school_id: school.id,

      academic_period_id: activeAcademicPeriod.id,

      schedule_version_id: scheduleVersion.id,

      source_fixed_period_id: fixedSlot.id,

      block_id: fixedSlot.block_id,

      group_id: fixedSlot.group_id,

      day_of_week: fixedSlot.day_of_week,

      shift_period_id: fixedSlot.shift_period_id,

      slot_order: fixedSlot.slot_order,

      activity_type: fixedSlot.activity_type || "workshop",

      label: fixedSlot.label || "Taller",

      color: fixedSlot.color || "#f59e0b",

      locked: true,
    }));

    console.info("Guardando talleres fijos:", {
      versionId: scheduleVersion.id,
      total: fixedEntriesPayload.length,
      sample: fixedEntriesPayload[0],
    });

    try {
      await insertInChunks({
        supabase,
        table: "schedule_fixed_entries",
        rows: fixedEntriesPayload,
      });
    } catch (fixedEntriesError) {
      throw new Error(
        getSupabaseErrorMessage(
          fixedEntriesError,
          "El horario fue calculado, pero no fue posible guardar los talleres fijos.",
        ),
      );
    }

    /*
     * 4. Verificar cuántas clases
     * se guardaron realmente.
     */
    const { count: storedEntriesCount, error: entriesCountError } =
      await supabase
        .from("schedule_entries")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("school_id", school.id)
        .eq("schedule_version_id", scheduleVersion.id);

    if (entriesCountError) {
      console.error("Error verificando clases guardadas:", entriesCountError);

      throw new Error(
        getSupabaseErrorMessage(
          entriesCountError,
          "No fue posible verificar las clases guardadas.",
        ),
      );
    }

    if (storedEntriesCount !== entriesPayload.length) {
      throw new Error(
        `Se esperaban ${entriesPayload.length} clases, pero se guardaron ${
          storedEntriesCount ?? 0
        }.`,
      );
    }

    /*
     * 5. Verificar los talleres guardados.
     */
    const { count: storedFixedEntriesCount, error: fixedEntriesCountError } =
      await supabase
        .from("schedule_fixed_entries")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("school_id", school.id)
        .eq("schedule_version_id", scheduleVersion.id);

    if (fixedEntriesCountError) {
      console.error(
        "Error verificando talleres guardados:",
        fixedEntriesCountError,
      );

      throw new Error(
        getSupabaseErrorMessage(
          fixedEntriesCountError,
          "No fue posible verificar los talleres guardados.",
        ),
      );
    }

    if (storedFixedEntriesCount !== fixedEntriesPayload.length) {
      throw new Error(
        `Se esperaban ${
          fixedEntriesPayload.length
        } horas de taller, pero se guardaron ${storedFixedEntriesCount ?? 0}.`,
      );
    }

    console.info("Horario guardado correctamente:", {
      scheduleVersionId: scheduleVersion.id,

      solverStatus: solverResult.status,

      storedEntries: storedEntriesCount,

      storedFixedEntries: storedFixedEntriesCount,
    });

    return {
      ...scheduleVersion,

      entriesCount: storedEntriesCount,

      fixedEntriesCount: storedFixedEntriesCount,
    };
  } catch (error) {
    console.error("Error guardando horario:", error);

    await cleanupIncompleteVersion({
      supabase,
      schoolId: school.id,
      versionId: scheduleVersionId,
    });

    throw error;
  }
}
