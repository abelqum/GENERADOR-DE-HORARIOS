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
  return [
    teacher.first_name,
    teacher.last_name,
  ]
    .filter(Boolean)
    .join(" ");
}

function logSupabaseError(
  title,
  error,
) {
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

export async function buildSchedulePayload({
  sourceVersionId = null,
} = {}) {
  const { school } =
    await getCurrentSchool();

  const supabase =
    await createClient();

  /*
   * El ciclo activo debe consultarse antes de utilizarlo
   * para validar una versión base.
   */
  const {
    data: activeAcademicPeriod,
    error: academicPeriodError,
  } = await supabase
    .from("academic_periods")
    .select(`
      id,
      name
    `)
    .eq("school_id", school.id)
    .eq("active", true)
    .maybeSingle();

  if (academicPeriodError) {
    logSupabaseError(
      "Error obteniendo ciclo escolar activo:",
      academicPeriodError,
    );

    throw new Error(
      "No fue posible consultar el ciclo escolar activo.",
    );
  }

  if (!activeAcademicPeriod) {
    throw new Error(
      "No existe un ciclo escolar activo.",
    );
  }

  let lockedEntries = [];

  /*
   * Durante la reoptimización, las clases bloqueadas
   * de la versión anterior se convierten en restricciones
   * obligatorias para el solver.
   */
  if (sourceVersionId) {
    const {
      data: sourceVersion,
      error: sourceVersionError,
    } = await supabase
      .from("schedule_versions")
      .select(`
        id,
        academic_period_id,
        status
      `)
      .eq("id", sourceVersionId)
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      )
      .maybeSingle();

    if (sourceVersionError) {
      logSupabaseError(
        "Error obteniendo versión base:",
        sourceVersionError,
      );

      throw new Error(
        "No fue posible consultar la versión base.",
      );
    }

    if (!sourceVersion) {
      throw new Error(
        "La versión utilizada como base no existe o pertenece a otro ciclo escolar.",
      );
    }

    if (
      sourceVersion.status !==
      "draft"
    ) {
      throw new Error(
        "Solamente se puede reoptimizar una versión en borrador.",
      );
    }

    const {
      data: lockedEntriesData,
      error: lockedEntriesError,
    } = await supabase
      .from("schedule_entries")
      .select(`
        teaching_assignment_id,
        occurrence_number,
        day_of_week,
        shift_period_id
      `)
      .eq("school_id", school.id)
      .eq(
        "schedule_version_id",
        sourceVersion.id,
      )
      .eq("locked", true);

    if (lockedEntriesError) {
      logSupabaseError(
        "Error obteniendo clases bloqueadas:",
        lockedEntriesError,
      );

      throw new Error(
        "No fue posible consultar las clases bloqueadas.",
      );
    }

    lockedEntries = (
      lockedEntriesData ?? []
    ).map((entry) => ({
      assignment_id:
        entry.teaching_assignment_id,

      occurrence_number:
        entry.occurrence_number,

      day_of_week:
        entry.day_of_week,

      shift_period_id:
        entry.shift_period_id,
    }));
  }

  const [
    {
      data: shiftPeriods,
      error: shiftPeriodsError,
    },
    {
      data: groups,
      error: groupsError,
    },
    {
      data: teachers,
      error: teachersError,
    },
    {
      data: assignments,
      error: assignmentsError,
    },
    {
      data: availability,
      error: availabilityError,
    },
  ] = await Promise.all([
    supabase
      .from("shift_periods")
      .select(`
        id,
        shift_id,
        period_number,
        name,
        start_time,
        end_time,
        period_type,
        active
      `)
      .eq("school_id", school.id)
      .eq("active", true)
      .order("period_number", {
        ascending: true,
      }),

    supabase
      .from("groups")
      .select(`
        id,
        name,
        grade_level_id,
        shift_id,
        academic_period_id,
        active
      `)
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      )
      .eq("active", true),

    supabase
      .from("teachers")
      .select(`
        id,
        first_name,
        last_name,
        max_weekly_periods,
        max_daily_periods,
        active
      `)
      .eq("school_id", school.id)
      .eq("active", true),

    supabase
      .from("teaching_assignments")
      .select(`
        id,
        group_id,
        subject_id,
        teacher_id,
        weekly_periods,
        max_periods_per_day,
        min_days_per_week,
        allow_consecutive_periods,
        preferred_block_size
      `)
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      ),

    supabase
      .from("teacher_availability")
      .select(`
        teacher_id,
        day_of_week,
        shift_period_id,
        availability_type,
        weight
      `)
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      ),
  ]);

  const queryErrors = [
    shiftPeriodsError,
    groupsError,
    teachersError,
    assignmentsError,
    availabilityError,
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

  if (
    !(shiftPeriods ?? []).length
  ) {
    throw new Error(
      "No existen horas escolares activas.",
    );
  }

  if (!(groups ?? []).length) {
    throw new Error(
      "No existen grupos activos para el ciclo actual.",
    );
  }

  if (
    !(teachers ?? []).length
  ) {
    throw new Error(
      "No existen profesores activos.",
    );
  }

  if (
    !(assignments ?? []).length
  ) {
    throw new Error(
      "No existen asignaciones docentes.",
    );
  }

  const activeGroupIds =
    new Set(
      (groups ?? []).map(
        (group) => group.id,
      ),
    );

  const activeTeacherIds =
    new Set(
      (teachers ?? []).map(
        (teacher) => teacher.id,
      ),
    );

  /*
   * Evitamos mandar al solver asignaciones que
   * pertenecen a grupos o profesores inactivos.
   */
  const usableAssignments = (
    assignments ?? []
  ).filter(
    (assignment) =>
      activeGroupIds.has(
        assignment.group_id,
      ) &&
      activeTeacherIds.has(
        assignment.teacher_id,
      ),
  );

  if (
    !usableAssignments.length
  ) {
    throw new Error(
      "Las asignaciones existentes no pertenecen a grupos y profesores activos.",
    );
  }

  const assignmentIds =
    new Set(
      usableAssignments.map(
        (assignment) =>
          assignment.id,
      ),
    );

  /*
   * Una clase bloqueada debe continuar vinculada
   * con una asignación que todavía exista.
   */
  const invalidLockedEntry =
    lockedEntries.find(
      (entry) =>
        !entry.assignment_id ||
        !assignmentIds.has(
          entry.assignment_id,
        ) ||
        !Number.isInteger(
          entry.occurrence_number,
        ) ||
        !Number.isInteger(
          entry.day_of_week,
        ) ||
        !entry.shift_period_id,
    );

  if (invalidLockedEntry) {
    throw new Error(
      "Una clase bloqueada de la versión base ya no corresponde con la configuración actual.",
    );
  }

  const payload = {
    school_id: school.id,

    academic_period_id:
      activeAcademicPeriod.id,

    days: SCHOOL_DAYS.map(
      (day) => day.value,
    ),

    shift_periods: (
      shiftPeriods ?? []
    ).map((period) => ({
      id: period.id,

      shift_id:
        period.shift_id,

      period_number:
        period.period_number,

      name: period.name,

      start_time:
        removeSeconds(
          period.start_time,
        ),

      end_time:
        removeSeconds(
          period.end_time,
        ),

      period_type:
        period.period_type,
    })),

    groups: (
      groups ?? []
    ).map((group) => ({
      id: group.id,

      name: group.name,

      grade_level_id:
        group.grade_level_id,

      shift_id:
        group.shift_id,
    })),

    teachers: (
      teachers ?? []
    ).map((teacher) => ({
      id: teacher.id,

      name:
        getTeacherName(
          teacher,
        ),

      max_weekly_periods:
        teacher.max_weekly_periods,

      max_daily_periods:
        teacher.max_daily_periods,
    })),

    assignments:
      usableAssignments.map(
        (assignment) => ({
          id: assignment.id,

          group_id:
            assignment.group_id,

          subject_id:
            assignment.subject_id,

          teacher_id:
            assignment.teacher_id,

          weekly_periods:
            assignment.weekly_periods,

          max_periods_per_day:
            assignment.max_periods_per_day,

          min_days_per_week:
            assignment.min_days_per_week,

          allow_consecutive_periods:
            assignment.allow_consecutive_periods,

          preferred_block_size:
            assignment.preferred_block_size,
        }),
      ),

    teacher_availability: (
      availability ?? []
    )
      .filter((item) =>
        activeTeacherIds.has(
          item.teacher_id,
        ),
      )
      .map((item) => ({
        teacher_id:
          item.teacher_id,

        day_of_week:
          item.day_of_week,

        shift_period_id:
          item.shift_period_id,

        availability_type:
          item.availability_type,

        weight:
          item.weight ?? 0,
      })),

    locked_entries:
      lockedEntries,

   options: {
  max_time_seconds: 15,

  num_workers: 8,

  optimize_preferences: true,

  random_seed: 0,

  penalize_avoid: 80,

  reward_preferred: 40,

  reward_required: 100,

  penalize_late_period: 4,

  penalize_isolated_teacher_period: 2,
},
  };

  return {
    school,

    activeAcademicPeriod,

    payload,

    assignments:
      usableAssignments,

    lockedEntries,

    sourceVersionId,
  };
}