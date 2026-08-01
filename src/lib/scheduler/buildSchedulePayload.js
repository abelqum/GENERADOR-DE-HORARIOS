import { SCHOOL_DAYS } from "@/constants/days";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

function removeSeconds(time) {
  if (!time) {
    return null;
  }

  return String(time).slice(0, 5);
}

function getTeacherName(teacher) {
  return [teacher.first_name, teacher.last_name].filter(Boolean).join(" ");
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

function groupBy(items, getKey) {
  return items.reduce((result, item) => {
    const key = getKey(item);

    if (!result.has(key)) {
      result.set(key, []);
    }

    result.get(key).push(item);

    return result;
  }, new Map());
}

function normalizeFixedGroupSlots({ groups, shiftPeriods, fixedPeriods }) {
  const periodsById = new Map(
    shiftPeriods.map((period) => [period.id, period]),
  );

  const fixedPeriodsByGroup = groupBy(
    fixedPeriods,
    (fixedPeriod) => fixedPeriod.group_id,
  );

  const normalizedSlots = [];

  for (const group of groups) {
    const groupFixedPeriods = [
      ...(fixedPeriodsByGroup.get(group.id) ?? []),
    ].sort((first, second) => first.slot_order - second.slot_order);

    if (groupFixedPeriods.length !== 3) {
      throw new Error(
        `El grupo ${group.name} debe tener exactamente tres horas fijas de taller antes de generar el horario.`,
      );
    }

    const blockIds = new Set(
      groupFixedPeriods.map((fixedPeriod) => fixedPeriod.block_id),
    );

    if (blockIds.size !== 1) {
      throw new Error(
        `Las horas de taller del grupo ${group.name} no pertenecen al mismo bloque.`,
      );
    }

    const days = new Set(
      groupFixedPeriods.map((fixedPeriod) => fixedPeriod.day_of_week),
    );

    if (days.size !== 1) {
      throw new Error(
        `Las tres horas de taller del grupo ${group.name} deben estar en el mismo día.`,
      );
    }

    const slotOrders = groupFixedPeriods.map(
      (fixedPeriod) => fixedPeriod.slot_order,
    );

    if (slotOrders[0] !== 1 || slotOrders[1] !== 2 || slotOrders[2] !== 3) {
      throw new Error(
        `El bloque de taller del grupo ${group.name} no contiene los tres espacios correctamente ordenados.`,
      );
    }

    const periodIds = new Set(
      groupFixedPeriods.map((fixedPeriod) => fixedPeriod.shift_period_id),
    );

    if (periodIds.size !== 3) {
      throw new Error(
        `El taller del grupo ${group.name} contiene horas repetidas.`,
      );
    }

    const resolvedPeriods = groupFixedPeriods.map((fixedPeriod) => {
      const period = periodsById.get(fixedPeriod.shift_period_id);

      if (!period) {
        throw new Error(
          `Una hora de taller del grupo ${group.name} ya no existe.`,
        );
      }

      if (period.shift_id !== group.shift_id) {
        throw new Error(
          `Una hora de taller del grupo ${group.name} no pertenece a su turno.`,
        );
      }

      if (period.period_type !== "class") {
        throw new Error(
          `El taller del grupo ${group.name} solamente puede ocupar horas de clase.`,
        );
      }

      if (!period.active) {
        throw new Error(
          `Una hora de taller del grupo ${group.name} está inactiva.`,
        );
      }

      const validDay = SCHOOL_DAYS.some(
        (day) => day.value === fixedPeriod.day_of_week,
      );

      if (!validDay) {
        throw new Error(
          `El taller del grupo ${group.name} tiene un día inválido.`,
        );
      }

      return period;
    });

    const periodsAreConsecutive =
      resolvedPeriods[1].period_number ===
        resolvedPeriods[0].period_number + 1 &&
      resolvedPeriods[2].period_number === resolvedPeriods[1].period_number + 1;

    if (!periodsAreConsecutive) {
      throw new Error(
        `Las tres horas de taller del grupo ${group.name} deben ser consecutivas y no pueden atravesar un receso.`,
      );
    }

    groupFixedPeriods.forEach((fixedPeriod) => {
      normalizedSlots.push({
        id: fixedPeriod.id,

        block_id: fixedPeriod.block_id,

        group_id: fixedPeriod.group_id,

        day_of_week: fixedPeriod.day_of_week,

        shift_period_id: fixedPeriod.shift_period_id,

        slot_order: fixedPeriod.slot_order,

        activity_type: fixedPeriod.activity_type || "workshop",

        label: fixedPeriod.label || "Taller",

        color: fixedPeriod.color || "#f59e0b",
      });
    });
  }

  return normalizedSlots;
}

function calculateGroupLoads({ groups, assignments }) {
  return groups.map((group) => {
    const groupAssignments = assignments.filter(
      (assignment) => assignment.group_id === group.id,
    );

    const requiredHours = groupAssignments.reduce(
      (total, assignment) => total + Number(assignment.weekly_periods ?? 0),
      0,
    );

    return {
      groupId: group.id,
      groupName: group.name,
      assignments: groupAssignments.length,
      requiredHours,
    };
  });
}

export async function buildSchedulePayload({ sourceVersionId = null } = {}) {
  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  const { data: activeAcademicPeriod, error: academicPeriodError } =
    await supabase
      .from("academic_periods")
      .select(
        `
      id,
      name
    `,
      )
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle();

  if (academicPeriodError) {
    logSupabaseError(
      "Error obteniendo ciclo escolar activo:",
      academicPeriodError,
    );

    throw new Error("No fue posible consultar el ciclo escolar activo.");
  }

  if (!activeAcademicPeriod) {
    throw new Error("No existe un ciclo escolar activo.");
  }

  let lockedEntries = [];

  if (sourceVersionId) {
    const { data: sourceVersion, error: sourceVersionError } = await supabase
      .from("schedule_versions")
      .select(
        `
        id,
        academic_period_id,
        status
      `,
      )
      .eq("id", sourceVersionId)
      .eq("school_id", school.id)
      .eq("academic_period_id", activeAcademicPeriod.id)
      .maybeSingle();

    if (sourceVersionError) {
      logSupabaseError("Error obteniendo versión base:", sourceVersionError);

      throw new Error("No fue posible consultar la versión base.");
    }

    if (!sourceVersion) {
      throw new Error(
        "La versión utilizada como base no existe o pertenece a otro ciclo escolar.",
      );
    }

    if (sourceVersion.status !== "draft") {
      throw new Error(
        "Solamente se puede reoptimizar una versión en borrador.",
      );
    }

    const { data: lockedEntriesData, error: lockedEntriesError } =
      await supabase
        .from("schedule_entries")
        .select(
          `
        teaching_assignment_id,
        occurrence_number,
        day_of_week,
        shift_period_id
      `,
        )
        .eq("school_id", school.id)
        .eq("schedule_version_id", sourceVersion.id)
        .eq("locked", true);

    if (lockedEntriesError) {
      logSupabaseError(
        "Error obteniendo clases bloqueadas:",
        lockedEntriesError,
      );

      throw new Error("No fue posible consultar las clases bloqueadas.");
    }

    lockedEntries = (lockedEntriesData ?? []).map((entry) => ({
      assignment_id: entry.teaching_assignment_id,

      occurrence_number: entry.occurrence_number,

      day_of_week: entry.day_of_week,

      shift_period_id: entry.shift_period_id,
    }));
  }

  const [
    { data: shiftPeriods, error: shiftPeriodsError },
    { data: groups, error: groupsError },
    { data: teachers, error: teachersError },
    { data: activeSubjects, error: activeSubjectsError },
    { data: assignments, error: assignmentsError },
    { data: availability, error: availabilityError },
    { data: fixedPeriods, error: fixedPeriodsError },
  ] = await Promise.all([
    /*
     * Horas activas de los turnos.
     */
    supabase
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
      .eq("school_id", school.id)
      .eq("active", true)
      .order("period_number", {
        ascending: true,
      }),

    /*
     * Grupos activos del ciclo escolar.
     */
    supabase
      .from("groups")
      .select(
        `
        id,
        name,
        grade_level_id,
        shift_id,
        academic_period_id,
        active
      `,
      )
      .eq("school_id", school.id)
      .eq("academic_period_id", activeAcademicPeriod.id)
      .eq("active", true),

    /*
     * Profesores activos.
     */
    supabase
      .from("teachers")
      .select(
        `
        id,
        first_name,
        last_name,
        max_weekly_periods,
        max_daily_periods,
        active
      `,
      )
      .eq("school_id", school.id)
      .eq("active", true),

    /*
     * Únicamente materias activas.
     *
     * Toda materia con active = false
     * queda fuera del generador.
     */
    supabase
      .from("subjects")
      .select(
        `
        id,
        name,
        active
      `,
      )
      .eq("school_id", school.id)
      .eq("active", true),

    /*
     * Se consultan todas las asignaciones
     * y después se filtran según el estado
     * del grupo, profesor y materia.
     */
    supabase
      .from("teaching_assignments")
      .select(
        `
        id,
        group_id,
        subject_id,
        teacher_id,
        weekly_periods,
        max_periods_per_day,
        min_days_per_week,
        allow_consecutive_periods,
        preferred_block_size
      `,
      )
      .eq("school_id", school.id)
      .eq("academic_period_id", activeAcademicPeriod.id),

    /*
     * Disponibilidad docente.
     */
    supabase
      .from("teacher_availability")
      .select(
        `
        teacher_id,
        day_of_week,
        shift_period_id,
        availability_type,
        weight
      `,
      )
      .eq("school_id", school.id)
      .eq("academic_period_id", activeAcademicPeriod.id),

    /*
     * Talleres fijos.
     */
    supabase
      .from("group_fixed_periods")
      .select(
        `
        id,
        block_id,
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
      .eq("activity_type", "workshop")
      .order("slot_order", {
        ascending: true,
      }),
  ]);

  const queryErrors = [
    shiftPeriodsError,
    groupsError,
    teachersError,
    activeSubjectsError,
    assignmentsError,
    availabilityError,
    fixedPeriodsError,
  ].filter(Boolean);

  if (queryErrors.length > 0) {
    console.error(
      "Error construyendo el payload del horario:",
      queryErrors.map((error) => ({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })),
    );

    throw new Error(
      "No fue posible consultar toda la configuración del horario.",
    );
  }

  if (!(shiftPeriods ?? []).length) {
    throw new Error("No existen horas escolares activas.");
  }

  if (!(groups ?? []).length) {
    throw new Error("No existen grupos activos para el ciclo actual.");
  }

  if (!(teachers ?? []).length) {
    throw new Error("No existen profesores activos.");
  }

  if (!(activeSubjects ?? []).length) {
    throw new Error("No existen materias activas.");
  }

  if (!(assignments ?? []).length) {
    throw new Error("No existen asignaciones docentes.");
  }

  const activeGroupIds = new Set((groups ?? []).map((group) => group.id));

  const activeTeacherIds = new Set(
    (teachers ?? []).map((teacher) => teacher.id),
  );

  /*
   * Conjunto con los IDs de las materias
   * que actualmente tienen active = true.
   */
  const activeSubjectIds = new Set(
    (activeSubjects ?? []).map((subject) => subject.id),
  );

  /*
   * Esta es la corrección principal.
   *
   * La asignación solamente se envía a Python
   * cuando:
   *
   * 1. El grupo está activo.
   * 2. El profesor está activo.
   * 3. La materia está activa.
   */
  const usableAssignments = (assignments ?? []).filter(
    (assignment) =>
      activeGroupIds.has(assignment.group_id) &&
      activeTeacherIds.has(assignment.teacher_id) &&
      activeSubjectIds.has(assignment.subject_id),
  );

  /*
   * Asignaciones ignoradas para diagnóstico.
   */
  const ignoredAssignments = (assignments ?? []).filter(
    (assignment) =>
      !activeGroupIds.has(assignment.group_id) ||
      !activeTeacherIds.has(assignment.teacher_id) ||
      !activeSubjectIds.has(assignment.subject_id),
  );

  if (!usableAssignments.length) {
    throw new Error(
      "No existen asignaciones con grupo, profesor y materia activos.",
    );
  }

  const assignmentIds = new Set(
    usableAssignments.map((assignment) => assignment.id),
  );

  /*
   * Una clase bloqueada no puede conservarse
   * si pertenece a una materia desactivada.
   */
  const invalidLockedEntry = lockedEntries.find(
    (entry) =>
      !entry.assignment_id ||
      !assignmentIds.has(entry.assignment_id) ||
      !Number.isInteger(entry.occurrence_number) ||
      !Number.isInteger(entry.day_of_week) ||
      !entry.shift_period_id,
  );

  if (invalidLockedEntry) {
    throw new Error(
      "Una clase bloqueada de la versión base pertenece a una asignación, materia, grupo o profesor que ya no está activo.",
    );
  }

  const fixedGroupSlots = normalizeFixedGroupSlots({
    groups: groups ?? [],
    shiftPeriods: shiftPeriods ?? [],
    fixedPeriods: fixedPeriods ?? [],
  });

  /*
   * Calculamos la carga que realmente
   * llegará al solver después de excluir
   * las materias inactivas.
   */
  const groupLoads = calculateGroupLoads({
    groups: groups ?? [],
    assignments: usableAssignments,
  });

  const totalRequiredEntries = usableAssignments.reduce(
    (total, assignment) => total + Number(assignment.weekly_periods ?? 0),
    0,
  );

  console.info("=== PAYLOAD DEL HORARIO ===");

  console.info("Resumen general:", {
    activeGroups: activeGroupIds.size,

    activeTeachers: activeTeacherIds.size,

    activeSubjects: activeSubjectIds.size,

    totalAssignmentsInDatabase: (assignments ?? []).length,

    assignmentsSentToSolver: usableAssignments.length,

    ignoredAssignments: ignoredAssignments.length,

    totalRequiredHours: totalRequiredEntries,

    fixedWorkshopHours: fixedGroupSlots.length,
  });

  console.table(groupLoads);

  if (ignoredAssignments.length > 0) {
    console.info(
      "Asignaciones ignoradas por tener grupo, profesor o materia inactivos:",
      ignoredAssignments.map((assignment) => ({
        assignmentId: assignment.id,

        groupId: assignment.group_id,

        teacherId: assignment.teacher_id,

        subjectId: assignment.subject_id,

        groupActive: activeGroupIds.has(assignment.group_id),

        teacherActive: activeTeacherIds.has(assignment.teacher_id),

        subjectActive: activeSubjectIds.has(assignment.subject_id),

        weeklyPeriods: assignment.weekly_periods,
      })),
    );
  }

  const payload = {
    school_id: school.id,

    academic_period_id: activeAcademicPeriod.id,

    days: SCHOOL_DAYS.map((day) => day.value),

    shift_periods: (shiftPeriods ?? []).map((period) => ({
      id: period.id,

      shift_id: period.shift_id,

      period_number: period.period_number,

      name: period.name,

      start_time: removeSeconds(period.start_time),

      end_time: removeSeconds(period.end_time),

      period_type: period.period_type,
    })),

    groups: (groups ?? []).map((group) => ({
      id: group.id,

      name: group.name,

      grade_level_id: group.grade_level_id,

      shift_id: group.shift_id,
    })),

    teachers: (teachers ?? []).map((teacher) => ({
      id: teacher.id,

      name: getTeacherName(teacher),

      max_weekly_periods: teacher.max_weekly_periods,

      max_daily_periods: teacher.max_daily_periods,
    })),

    /*
     * Solamente llegan al solver las
     * asignaciones cuya materia está activa.
     */
    assignments: usableAssignments.map((assignment) => ({
      id: assignment.id,

      group_id: assignment.group_id,

      subject_id: assignment.subject_id,

      teacher_id: assignment.teacher_id,

      weekly_periods: assignment.weekly_periods,

      max_periods_per_day: assignment.max_periods_per_day,

      min_days_per_week: assignment.min_days_per_week,

      allow_consecutive_periods: assignment.allow_consecutive_periods,

      preferred_block_size: assignment.preferred_block_size,
    })),

    teacher_availability: (availability ?? [])
      .filter((item) => activeTeacherIds.has(item.teacher_id))
      .map((item) => ({
        teacher_id: item.teacher_id,

        day_of_week: item.day_of_week,

        shift_period_id: item.shift_period_id,

        availability_type: item.availability_type,

        weight: item.weight ?? 0,
      })),

    locked_entries: lockedEntries,

    fixed_group_slots: fixedGroupSlots,

    options: {
      max_time_seconds: 55,

      num_workers: 8,

      /*
       * Primero se busca cualquier horario
       * válido respetando las restricciones
       * obligatorias.
       */
      optimize_preferences: false,

      random_seed: 0,

      penalize_avoid: 80,

      reward_preferred: 40,

      reward_required: 100,

      penalize_late_period: 4,

      penalize_isolated_teacher_period: 0,

      reward_consecutive_assignment_periods: 15,
    },
  };

  return {
    school,

    activeAcademicPeriod,

    payload,

    /*
     * Estas son exactamente las asignaciones
     * consideradas por el solver.
     */
    assignments: usableAssignments,

    ignoredAssignments,

    totalRequiredEntries,

    groupLoads,

    lockedEntries,

    fixedGroupSlots,

    sourceVersionId,
  };
}
