import { createClient } from "@/lib/supabase/server";

function buildVersionName(activeAcademicPeriod, createdAt) {
  const formattedDate = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",

    timeZone: "America/Mexico_City",
  }).format(createdAt);

  return `${activeAcademicPeriod.name} · ` + formattedDate;
}

async function cleanupVersion({ supabase, schoolId, versionId }) {
  if (!versionId) {
    return;
  }

  const { error } = await supabase
    .from("schedule_versions")
    .delete()
    .eq("id", versionId)
    .eq("school_id", schoolId);

  if (error) {
    console.error("Error limpiando versión incompleta:", error);
  }
}

export async function saveScheduleResult({
  school,

  activeAcademicPeriod,

  solverResult,

  fixedGroupSlots = [],

  userId,

  sourceVersionId = null,

  versionName = null,
}) {
  if (!school?.id) {
    throw new Error("No se identificó la escuela.");
  }

  if (!activeAcademicPeriod?.id) {
    throw new Error("No se identificó el ciclo escolar.");
  }

  if (!solverResult || !Array.isArray(solverResult.entries)) {
    throw new Error("El resultado del solver no contiene clases válidas.");
  }

  if (solverResult.entries.length === 0) {
    throw new Error("El solver no devolvió ninguna clase para guardar.");
  }

  if (!Array.isArray(fixedGroupSlots) || fixedGroupSlots.length === 0) {
    throw new Error("No se recibieron los talleres fijos de los grupos.");
  }

  const supabase = await createClient();

  const createdAt = new Date();

  const versionPayload = {
    school_id: school.id,

    academic_period_id: activeAcademicPeriod.id,

    name: versionName || buildVersionName(activeAcademicPeriod, createdAt),

    status: "draft",

    solver_status: solverResult.status,

    objective_value: solverResult.statistics?.objective_value ?? null,

    solver_statistics: solverResult.statistics ?? {},

    warnings: solverResult.warnings ?? [],

    generated_by: userId,

    source_version_id: sourceVersionId,
  };

  const { data: scheduleVersion, error: versionError } = await supabase
    .from("schedule_versions")
    .insert(versionPayload)
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
      [
        "No fue posible crear la versión del horario.",

        versionError?.message ? `Error: ${versionError.message}` : null,

        versionError?.details ? `Detalles: ${versionError.details}` : null,

        versionError?.hint ? `Sugerencia: ${versionError.hint}` : null,

        versionError?.code ? `Código: ${versionError.code}` : null,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  const entriesPayload = solverResult.entries.map((entry, index) => ({
    school_id: school.id,

    academic_period_id: activeAcademicPeriod.id,

    schedule_version_id: scheduleVersion.id,

    teaching_assignment_id: entry.assignment_id,

    group_id: entry.group_id,

    subject_id: entry.subject_id,

    teacher_id: entry.teacher_id,

    occurrence_number: Number.isInteger(entry.occurrence_number)
      ? entry.occurrence_number
      : index + 1,

    day_of_week: entry.day_of_week,

    shift_period_id: entry.shift_period_id,

    preference_score: entry.preference_score ?? 0,

    locked: Boolean(entry.locked),
  }));

  const invalidEntry = entriesPayload.find(
    (entry) =>
      !entry.teaching_assignment_id ||
      !entry.group_id ||
      !entry.subject_id ||
      !entry.teacher_id ||
      !entry.shift_period_id ||
      !Number.isInteger(entry.day_of_week),
  );

  if (invalidEntry) {
    await cleanupVersion({
      supabase,

      schoolId: school.id,

      versionId: scheduleVersion.id,
    });

    throw new Error(
      "El solver devolvió una clase incompleta. La versión no fue guardada.",
    );
  }

  const { error: entriesError } = await supabase
    .from("schedule_entries")
    .insert(entriesPayload);

  if (entriesError) {
    console.error("Error guardando clases del horario:", entriesError);

    await cleanupVersion({
      supabase,

      schoolId: school.id,

      versionId: scheduleVersion.id,
    });

    throw new Error(
      entriesError.message
        ? "No fue posible guardar las clases generadas. " + entriesError.message
        : "No fue posible guardar las clases generadas.",
    );
  }

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

  const invalidFixedEntry = fixedEntriesPayload.find(
    (entry) =>
      !entry.source_fixed_period_id ||
      !entry.block_id ||
      !entry.group_id ||
      !entry.shift_period_id ||
      !Number.isInteger(entry.day_of_week) ||
      !Number.isInteger(entry.slot_order),
  );

  if (invalidFixedEntry) {
    await cleanupVersion({
      supabase,

      schoolId: school.id,

      versionId: scheduleVersion.id,
    });

    throw new Error(
      "Uno de los talleres fijos está incompleto. La versión fue descartada.",
    );
  }

  const { error: fixedEntriesError } = await supabase
    .from("schedule_fixed_entries")
    .insert(fixedEntriesPayload);

  if (fixedEntriesError) {
    console.error("Error guardando talleres fijos:", fixedEntriesError);

    await cleanupVersion({
      supabase,

      schoolId: school.id,

      versionId: scheduleVersion.id,
    });

    throw new Error(
      fixedEntriesError.message
        ? "El horario fue calculado, pero no fue posible guardar los talleres fijos. " +
            fixedEntriesError.message
        : "No fue posible guardar los talleres fijos.",
    );
  }

  const [
    { count: storedEntriesCount, error: countError },
    { count: storedFixedEntriesCount, error: fixedCountError },
  ] = await Promise.all([
    supabase
      .from("schedule_entries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("schedule_version_id", scheduleVersion.id),

    supabase
      .from("schedule_fixed_entries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("schedule_version_id", scheduleVersion.id),
  ]);

  if (countError || fixedCountError) {
    console.error(
      "Error verificando horario guardado:",
      countError || fixedCountError,
    );

    await cleanupVersion({
      supabase,

      schoolId: school.id,

      versionId: scheduleVersion.id,
    });

    throw new Error("No fue posible verificar el horario guardado.");
  }

  if (storedEntriesCount !== entriesPayload.length) {
    await cleanupVersion({
      supabase,

      schoolId: school.id,

      versionId: scheduleVersion.id,
    });

    throw new Error(
      `Se esperaban ${entriesPayload.length} clases, pero solamente se guardaron ${storedEntriesCount ?? 0}.`,
    );
  }

  if (storedFixedEntriesCount !== fixedEntriesPayload.length) {
    await cleanupVersion({
      supabase,

      schoolId: school.id,

      versionId: scheduleVersion.id,
    });

    throw new Error(
      `Se esperaban ${fixedEntriesPayload.length} horas de taller, pero solamente se guardaron ${storedFixedEntriesCount ?? 0}.`,
    );
  }

  return {
    ...scheduleVersion,

    entriesCount: storedEntriesCount,

    fixedEntriesCount: storedFixedEntriesCount,
  };
}
