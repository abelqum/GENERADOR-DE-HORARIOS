import { createClient } from "@/lib/supabase/server";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { SCHOOL_DAYS } from "@/constants/days";
import { createValidationResult } from "@/lib/scheduler/createValidationResult";

function sum(values) {
  return values.reduce(
    (total, value) => total + Number(value || 0),
    0,
  );
}
function timeToMinutes(time) {
  if (!time) {
    return null;
  }

  const [hours, minutes] = String(time)
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function timeRangesOverlap(
  firstStart,
  firstEnd,
  secondStart,
  secondEnd,
) {
  const firstStartMinutes =
    timeToMinutes(firstStart);

  const firstEndMinutes =
    timeToMinutes(firstEnd);

  const secondStartMinutes =
    timeToMinutes(secondStart);

  const secondEndMinutes =
    timeToMinutes(secondEnd);

  if (
    firstStartMinutes === null ||
    firstEndMinutes === null ||
    secondStartMinutes === null ||
    secondEndMinutes === null
  ) {
    return false;
  }

  return (
    firstStartMinutes < secondEndMinutes &&
    secondStartMinutes < firstEndMinutes
  );
}

function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);

    return groups;
  }, new Map());
}

function getTeacherName(teacher) {
  if (!teacher) {
    return "Profesor desconocido";
  }

  return `${teacher.first_name} ${teacher.last_name}`.trim();
}

function getClassPeriodsByShift(shiftPeriods) {
  return shiftPeriods.filter(
    (period) =>
      period.active &&
      period.period_type === "class",
  );
}

function createAvailabilityKey(
  teacherId,
  dayOfWeek,
  shiftPeriodId,
) {
  return `${teacherId}-${dayOfWeek}-${shiftPeriodId}`;
}

export async function validateScheduleConfiguration() {
  const { school } = await getCurrentSchool();
  const supabase = await createClient();

  const results = [];

  const [
    { data: activeAcademicPeriod, error: academicPeriodError },
    { data: shifts, error: shiftsError },
    { data: shiftPeriods, error: shiftPeriodsError },
    { data: gradeLevels, error: gradeLevelsError },
    { data: groups, error: groupsError },
    { data: subjects, error: subjectsError },
    { data: teachers, error: teachersError },
    {
      data: curriculumRequirements,
      error: curriculumRequirementsError,
    },
    {
      data: teacherSubjects,
      error: teacherSubjectsError,
    },
    { data: teacherShifts, error: teacherShiftsError },
  ] = await Promise.all([
    supabase
      .from("academic_periods")
      .select(`
        id,
        name,
        start_date,
        end_date,
        active
      `)
      .eq("school_id", school.id)
      .eq("active", true)
      .maybeSingle(),

    supabase
      .from("shifts")
      .select(`
        id,
        name,
        start_time,
        end_time,
        active
      `)
      .eq("school_id", school.id)
      .eq("active", true)
      .order("start_time", {
        ascending: true,
      }),

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
      .from("grade_levels")
      .select(`
        id,
        name,
        order_number,
        active
      `)
      .eq("school_id", school.id)
      .eq("active", true),

    supabase
      .from("groups")
      .select(`
        id,
        name,
        academic_period_id,
        grade_level_id,
        shift_id,
        active
      `)
      .eq("school_id", school.id)
      .eq("active", true),

    supabase
      .from("subjects")
      .select(`
        id,
        name,
        code,
        active
      `)
      .eq("school_id", school.id)
      .eq("active", true),

    supabase
      .from("teachers")
      .select(`
        id,
        employee_number,
        first_name,
        last_name,
        max_weekly_periods,
        max_daily_periods,
        active
      `)
      .eq("school_id", school.id)
      .eq("active", true),

    supabase
      .from("curriculum_requirements")
      .select(`
        id,
        academic_period_id,
        grade_level_id,
        subject_id,
        weekly_periods,
        max_periods_per_day,
        min_days_per_week,
        allow_consecutive_periods,
        preferred_block_size
      `)
      .eq("school_id", school.id),

    supabase
      .from("teacher_subjects")
      .select(`
        id,
        teacher_id,
        subject_id,
        priority,
        is_primary
      `)
      .eq("school_id", school.id),

    supabase
      .from("teacher_shifts")
      .select(`
        id,
        teacher_id,
        shift_id,
        max_weekly_periods
      `)
      .eq("school_id", school.id),
  ]);

  const queryErrors = [
    academicPeriodError,
    shiftsError,
    shiftPeriodsError,
    gradeLevelsError,
    groupsError,
    subjectsError,
    teachersError,
    curriculumRequirementsError,
    teacherSubjectsError,
    teacherShiftsError,
  ].filter(Boolean);

  if (queryErrors.length > 0) {
    console.error(
      "Errores obteniendo datos para validación:",
      queryErrors,
    );

    results.push(
      createValidationResult({
        id: "database-read-error",
        level: "error",
        title: "No fue posible leer la configuración",
        message:
          "Ocurrió un error al consultar la información necesaria para validar el horario.",
        module: "Sistema",
      }),
    );

    return createValidationResponse({
      school,
      activeAcademicPeriod,
      results,
      statistics: {},
    });
  }

  if (!activeAcademicPeriod) {
    results.push(
      createValidationResult({
        id: "missing-active-academic-period",
        level: "error",
        title: "No existe un ciclo escolar activo",
        message:
          "Debes seleccionar un ciclo escolar activo antes de generar horarios.",
        module: "Ciclos escolares",
      }),
    );

    return createValidationResponse({
      school,
      activeAcademicPeriod: null,
      results,
      statistics: {
        groups: 0,
        teachers: teachers?.length ?? 0,
        subjects: subjects?.length ?? 0,
        assignments: 0,
        weeklyLessons: 0,
      },
    });
  }

  const activeGroups = (groups ?? []).filter(
    (group) =>
      group.academic_period_id ===
      activeAcademicPeriod.id,
  );

  const activeCurriculumRequirements = (
    curriculumRequirements ?? []
  ).filter(
    (requirement) =>
      requirement.academic_period_id ===
      activeAcademicPeriod.id,
  );

  const [
    {
      data: teachingAssignments,
      error: teachingAssignmentsError,
    },
    {
      data: teacherAvailability,
      error: teacherAvailabilityError,
    },
  ] = await Promise.all([
    supabase
      .from("teaching_assignments")
      .select(`
        id,
        academic_period_id,
        group_id,
        subject_id,
        teacher_id,
        weekly_periods,
        max_periods_per_day,
        min_days_per_week,
        allow_consecutive_periods,
        preferred_block_size,
        locked
      `)
      .eq("school_id", school.id)
      .eq(
        "academic_period_id",
        activeAcademicPeriod.id,
      ),

    supabase
      .from("teacher_availability")
      .select(`
        id,
        academic_period_id,
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

  if (
    teachingAssignmentsError ||
    teacherAvailabilityError
  ) {
    console.error(
      "Error obteniendo asignaciones o disponibilidad:",
      teachingAssignmentsError ||
        teacherAvailabilityError,
    );

    results.push(
      createValidationResult({
        id: "configuration-read-error",
        level: "error",
        title: "No fue posible completar la validación",
        message:
          "Ocurrió un error al consultar asignaciones docentes o disponibilidad.",
        module: "Sistema",
      }),
    );

    return createValidationResponse({
      school,
      activeAcademicPeriod,
      results,
      statistics: {},
    });
  }

  const assignments = teachingAssignments ?? [];
  const availability = teacherAvailability ?? [];

  const shiftsById = new Map(
    (shifts ?? []).map((shift) => [
      shift.id,
      shift,
    ]),
  );

  const groupsById = new Map(
    activeGroups.map((group) => [
      group.id,
      group,
    ]),
  );

  const gradeLevelsById = new Map(
    (gradeLevels ?? []).map((gradeLevel) => [
      gradeLevel.id,
      gradeLevel,
    ]),
  );

  const subjectsById = new Map(
    (subjects ?? []).map((subject) => [
      subject.id,
      subject,
    ]),
  );

  const teachersById = new Map(
    (teachers ?? []).map((teacher) => [
      teacher.id,
      teacher,
    ]),
  );

  const shiftPeriodsByShift = groupBy(
    shiftPeriods ?? [],
    (period) => period.shift_id,
  );

  const assignmentsByGroup = groupBy(
    assignments,
    (assignment) => assignment.group_id,
  );

  const assignmentsByTeacher = groupBy(
    assignments,
    (assignment) => assignment.teacher_id,
  );

  const teacherSubjectsSet = new Set(
    (teacherSubjects ?? []).map(
      (item) =>
        `${item.teacher_id}-${item.subject_id}`,
    ),
  );

  const teacherShiftsMap = new Map(
    (teacherShifts ?? []).map((item) => [
      `${item.teacher_id}-${item.shift_id}`,
      item,
    ]),
  );

  const availabilityMap = new Map(
    availability.map((item) => [
      createAvailabilityKey(
        item.teacher_id,
        item.day_of_week,
        item.shift_period_id,
      ),
      item,
    ]),
  );

  validateGeneralConfiguration({
    results,
    activeGroups,
    teachers: teachers ?? [],
    subjects: subjects ?? [],
    shifts: shifts ?? [],
  });

  validateShifts({
    results,
    shifts: shifts ?? [],
    shiftPeriodsByShift,
  });
  validateDuplicateAssignments({
    results,
    assignments,
    groupsById,
    subjectsById,
  });

  validateAssignmentsAgainstCurriculum({
    results,
    activeGroups,
    assignmentsByGroup,
    activeCurriculumRequirements,
    subjectsById,
  });
  validateGroups({
    results,
    activeGroups,
    assignmentsByGroup,
    activeCurriculumRequirements,
    gradeLevelsById,
    subjectsById,
    shiftsById,
    shiftPeriodsByShift,
  });

  validateAssignments({
    results,
    assignments,
    groupsById,
    subjectsById,
    teachersById,
    teacherSubjectsSet,
    teacherShiftsMap,
  });

 validateTeacherLoads({
  results,
  teachers: teachers ?? [],
  assignmentsByTeacher,
  groupsById,
  shiftsById,
  teacherShiftsMap,
  shiftPeriodsByShift,
});

  validateTeacherAvailability({
    results,
    teachers: teachers ?? [],
    assignmentsByTeacher,
    groupsById,
    shiftsById,
    shiftPeriodsByShift,
    availabilityMap,
  });

  if (
    !results.some(
      (result) => result.level === "error",
    )
  ) {
    results.push(
      createValidationResult({
        id: "configuration-ready",
        level: "success",
        title: "Configuración lista para generar",
        message:
          "No se encontraron errores que impidan ejecutar el motor de horarios.",
        module: "Generador",
      }),
    );
  }

  const weeklyLessons = sum(
    assignments.map(
      (assignment) => assignment.weekly_periods,
    ),
  );

  return createValidationResponse({
    school,
    activeAcademicPeriod,
    results,
    statistics: {
      groups: activeGroups.length,
      teachers: teachers?.length ?? 0,
      subjects: subjects?.length ?? 0,
      assignments: assignments.length,
      weeklyLessons,
      shifts: shifts?.length ?? 0,
    },
  });
}

function validateGeneralConfiguration({
  results,
  activeGroups,
  teachers,
  subjects,
  shifts,
}) {
  if (shifts.length === 0) {
    results.push(
      createValidationResult({
        id: "missing-shifts",
        level: "error",
        title: "No hay turnos activos",
        message:
          "Debes registrar al menos un turno activo.",
        module: "Turnos",
      }),
    );
  }

  if (activeGroups.length === 0) {
    results.push(
      createValidationResult({
        id: "missing-groups",
        level: "error",
        title: "No hay grupos en el ciclo activo",
        message:
          "Debes registrar al menos un grupo para el ciclo escolar actual.",
        module: "Grupos",
      }),
    );
  }

  if (subjects.length === 0) {
    results.push(
      createValidationResult({
        id: "missing-subjects",
        level: "error",
        title: "No hay materias activas",
        message:
          "Debes registrar las materias del plan escolar.",
        module: "Materias",
      }),
    );
  }

  if (teachers.length === 0) {
    results.push(
      createValidationResult({
        id: "missing-teachers",
        level: "error",
        title: "No hay profesores activos",
        message:
          "Debes registrar profesores antes de crear el horario.",
        module: "Profesores",
      }),
    );
  }
}

function validateShifts({
  results,
  shifts,
  shiftPeriodsByShift,
}) {
  for (const shift of shifts) {
    const periods =
      shiftPeriodsByShift.get(shift.id) ?? [];

    const classPeriods =
      getClassPeriodsByShift(periods);

    if (classPeriods.length === 0) {
      results.push(
        createValidationResult({
          id: `shift-without-periods-${shift.id}`,
          level: "error",
          title: `El turno ${shift.name} no tiene horas de clase`,
          message:
            "Configura al menos una hora de tipo clase dentro de este turno.",
          module: "Horas",
          entityId: shift.id,
        }),
      );

      continue;
    }

    const shiftStart =
      timeToMinutes(shift.start_time);

    const shiftEnd =
      timeToMinutes(shift.end_time);

    if (
      shiftStart === null ||
      shiftEnd === null ||
      shiftStart >= shiftEnd
    ) {
      results.push(
        createValidationResult({
          id: `invalid-shift-range-${shift.id}`,
          level: "error",
          title: `El turno ${shift.name} tiene un horario inválido`,
          message:
            "La hora de finalización del turno debe ser posterior a la hora de inicio.",
          module: "Turnos",
          entityId: shift.id,
        }),
      );

      continue;
    }

    const usedPeriodNumbers = new Set();

    for (const period of periods) {
      const periodStart =
        timeToMinutes(period.start_time);

      const periodEnd =
        timeToMinutes(period.end_time);

      if (
        periodStart === null ||
        periodEnd === null ||
        periodStart >= periodEnd
      ) {
        results.push(
          createValidationResult({
            id: `invalid-period-range-${period.id}`,
            level: "error",
            title: `${period.name} tiene un horario inválido`,
            message:
              "La hora final debe ser posterior a la hora inicial.",
            module: "Horas",
            entityId: period.id,
          }),
        );

        continue;
      }

      if (
        periodStart < shiftStart ||
        periodEnd > shiftEnd
      ) {
        results.push(
          createValidationResult({
            id: `period-outside-shift-${period.id}`,
            level: "error",
            title: `${period.name} está fuera del turno ${shift.name}`,
            message: `La hora debe encontrarse entre ${String(
              shift.start_time,
            ).slice(0, 5)} y ${String(
              shift.end_time,
            ).slice(0, 5)}.`,
            module: "Horas",
            entityId: period.id,
          }),
        );
      }

      if (
        usedPeriodNumbers.has(
          period.period_number,
        )
      ) {
        results.push(
          createValidationResult({
            id: `duplicate-period-number-${shift.id}-${period.period_number}`,
            level: "error",
            title: `El turno ${shift.name} tiene horas con el mismo orden`,
            message: `Existe más de una hora con el número ${period.period_number}.`,
            module: "Horas",
            entityId: shift.id,
          }),
        );
      }

      usedPeriodNumbers.add(
        period.period_number,
      );
    }

    for (
      let firstIndex = 0;
      firstIndex < periods.length;
      firstIndex += 1
    ) {
      for (
        let secondIndex =
          firstIndex + 1;
        secondIndex < periods.length;
        secondIndex += 1
      ) {
        const firstPeriod =
          periods[firstIndex];

        const secondPeriod =
          periods[secondIndex];

        if (
          timeRangesOverlap(
            firstPeriod.start_time,
            firstPeriod.end_time,
            secondPeriod.start_time,
            secondPeriod.end_time,
          )
        ) {
          results.push(
            createValidationResult({
              id: `overlapping-periods-${firstPeriod.id}-${secondPeriod.id}`,
              level: "error",
              title: `Hay horas traslapadas en el turno ${shift.name}`,
              message: `${firstPeriod.name} se traslapa con ${secondPeriod.name}.`,
              module: "Horas",
              entityId: shift.id,
              details: {
                firstPeriodId:
                  firstPeriod.id,
                secondPeriodId:
                  secondPeriod.id,
              },
            }),
          );
        }
      }
    }
  }
}
function validateDuplicateAssignments({
  results,
  assignments,
  groupsById,
  subjectsById,
}) {
  const assignmentKeys = new Map();

  for (const assignment of assignments) {
    const key =
      `${assignment.group_id}-${assignment.subject_id}`;

    if (!assignmentKeys.has(key)) {
      assignmentKeys.set(
        key,
        assignment,
      );

      continue;
    }

    const group = groupsById.get(
      assignment.group_id,
    );

    const subject = subjectsById.get(
      assignment.subject_id,
    );

    results.push(
      createValidationResult({
        id: `duplicate-assignment-${key}`,
        level: "error",
        title: `Asignación duplicada en ${group?.name ?? "un grupo"}`,
        message: `${subject?.name ?? "La materia"} tiene más de un profesor o registro asignado para el mismo grupo.`,
        module: "Asignaciones",
        entityId: assignment.group_id,
      }),
    );
  }
}


function validateAssignmentsAgainstCurriculum({
  results,
  activeGroups,
  assignmentsByGroup,
  activeCurriculumRequirements,
  subjectsById,
}) {
  for (const group of activeGroups) {
    const groupAssignments =
      assignmentsByGroup.get(group.id) ?? [];

    const curriculumBySubject =
      new Map(
        activeCurriculumRequirements
          .filter(
            (requirement) =>
              requirement.grade_level_id ===
              group.grade_level_id,
          )
          .map((requirement) => [
            requirement.subject_id,
            requirement,
          ]),
      );

    for (const assignment of groupAssignments) {
      const requirement =
        curriculumBySubject.get(
          assignment.subject_id,
        );

      const subject = subjectsById.get(
        assignment.subject_id,
      );

      if (!requirement) {
        results.push(
          createValidationResult({
            id: `assignment-without-curriculum-${assignment.id}`,
            level: "error",
            title: `${subject?.name ?? "Una materia"} no pertenece a la carga curricular de ${group.name}`,
            message:
              "La asignación existe, pero la materia no está configurada para el grado de este grupo.",
            module: "Carga curricular",
            entityId: assignment.id,
          }),
        );

        continue;
      }

      if (
        Number(
          assignment.weekly_periods,
        ) !==
        Number(
          requirement.weekly_periods,
        )
      ) {
        results.push(
          createValidationResult({
            id: `assignment-hours-mismatch-${assignment.id}`,
            level: "error",
            title: `Las horas de ${subject?.name ?? "una materia"} no coinciden`,
            message: `La carga curricular exige ${requirement.weekly_periods} horas semanales para ${group.name}, pero la asignación tiene ${assignment.weekly_periods}.`,
            module: "Asignaciones",
            entityId: assignment.id,
            details: {
              curriculumHours:
                requirement.weekly_periods,
              assignmentHours:
                assignment.weekly_periods,
            },
          }),
        );
      }
    }
  }
}
function validateGroups({
  results,
  activeGroups,
  assignmentsByGroup,
  activeCurriculumRequirements,
  gradeLevelsById,
  subjectsById,
  shiftsById,
  shiftPeriodsByShift,
}) {
  for (const group of activeGroups) {
    const gradeLevel = gradeLevelsById.get(
      group.grade_level_id,
    );

    const shift = shiftsById.get(group.shift_id);

    const groupAssignments =
      assignmentsByGroup.get(group.id) ?? [];

    const gradeCurriculum =
      activeCurriculumRequirements.filter(
        (requirement) =>
          requirement.grade_level_id ===
          group.grade_level_id,
      );

    if (groupAssignments.length === 0) {
      results.push(
        createValidationResult({
          id: `group-without-assignments-${group.id}`,
          level: "error",
          title: `El grupo ${group.name} no tiene asignaciones`,
          message:
            "Debes asignar profesores a las materias de este grupo.",
          module: "Asignaciones",
          entityId: group.id,
        }),
      );
    }

    if (gradeCurriculum.length === 0) {
      results.push(
        createValidationResult({
          id: `group-without-curriculum-${group.id}`,
          level: "error",
          title: `El grado ${gradeLevel?.name ?? ""} no tiene carga curricular`,
          message: `El grupo ${group.name} no puede programarse porque su grado no tiene materias configuradas.`,
          module: "Carga curricular",
          entityId: group.id,
        }),
      );

      continue;
    }

    for (const requirement of gradeCurriculum) {
      const assignment = groupAssignments.find(
        (item) =>
          item.subject_id ===
          requirement.subject_id,
      );

      if (!assignment) {
        const subject = subjectsById.get(
          requirement.subject_id,
        );

        results.push(
          createValidationResult({
            id: `missing-assignment-${group.id}-${requirement.subject_id}`,
            level: "error",
            title: `${group.name} no tiene profesor para ${subject?.name ?? "una materia"}`,
            message:
              "Existe una carga curricular para esta materia, pero todavía no tiene profesor asignado.",
            module: "Asignaciones",
            entityId: group.id,
          }),
        );
      }
    }

    const classPeriods = getClassPeriodsByShift(
      shiftPeriodsByShift.get(group.shift_id) ??
        [],
    );

    const availableWeeklySlots =
      classPeriods.length * SCHOOL_DAYS.length;

    const requiredWeeklySlots = sum(
      groupAssignments.map(
        (assignment) =>
          assignment.weekly_periods,
      ),
    );
    const dailyClassPeriods =
      classPeriods.length;

    for (const assignment of groupAssignments) {
      const subject = subjectsById.get(
        assignment.subject_id,
      );

      if (
        assignment.max_periods_per_day >
        dailyClassPeriods
      ) {
        results.push(
          createValidationResult({
            id: `assignment-exceeds-daily-shift-${assignment.id}`,
            level: "error",
            title: `${subject?.name ?? "Una materia"} supera las horas disponibles por día`,
            message: `La asignación permite hasta ${assignment.max_periods_per_day} horas diarias, pero el turno ${shift?.name ?? ""} solamente tiene ${dailyClassPeriods} horas de clase al día.`,
            module: "Asignaciones",
            entityId: assignment.id,
          }),
        );
      }

      if (
        assignment.preferred_block_size >
        dailyClassPeriods
      ) {
        results.push(
          createValidationResult({
            id: `block-exceeds-shift-${assignment.id}`,
            level: "error",
            title: `El bloque de ${subject?.name ?? "una materia"} no cabe en el turno`,
            message: `El bloque preferido es de ${assignment.preferred_block_size} horas, pero el turno solamente tiene ${dailyClassPeriods} horas de clase por día.`,
            module: "Asignaciones",
            entityId: assignment.id,
          }),
        );
      }
    }
    if (
      requiredWeeklySlots >
      availableWeeklySlots
    ) {
      results.push(
        createValidationResult({
          id: `group-over-capacity-${group.id}`,
          level: "error",
          title: `El grupo ${group.name} supera la capacidad del turno`,
          message: `Requiere ${requiredWeeklySlots} clases semanales, pero el turno ${shift?.name ?? ""} solamente ofrece ${availableWeeklySlots} espacios.`,
          module: "Grupos",
          entityId: group.id,
          details: {
            requiredWeeklySlots,
            availableWeeklySlots,
          },
        }),
      );
    } else if (
      availableWeeklySlots - requiredWeeklySlots <= 2
    ) {
      results.push(
        createValidationResult({
          id: `group-low-slack-${group.id}`,
          level: "warning",
          title: `El grupo ${group.name} tiene muy poco margen`,
          message: `Solamente quedan ${availableWeeklySlots - requiredWeeklySlots} espacios libres en su turno.`,
          module: "Grupos",
          entityId: group.id,
        }),
      );
    }
  }
}

function validateAssignments({
  results,
  assignments,
  groupsById,
  subjectsById,
  teachersById,
  teacherSubjectsSet,
  teacherShiftsMap,
}) {
  for (const assignment of assignments) {
    const group = groupsById.get(
      assignment.group_id,
    );

    const teacher = teachersById.get(
      assignment.teacher_id,
    );

    const subject = subjectsById.get(
      assignment.subject_id,
    );

    if (!group) {
      results.push(
        createValidationResult({
          id: `assignment-without-group-${assignment.id}`,
          level: "error",
          title: "Asignación con grupo inválido",
          message:
            "Una asignación docente está relacionada con un grupo inexistente o inactivo.",
          module: "Asignaciones",
          entityId: assignment.id,
        }),
      );

      continue;
    }

    if (!teacher) {
      results.push(
        createValidationResult({
          id: `assignment-without-teacher-${assignment.id}`,
          level: "error",
          title: `La asignación de ${subject?.name ?? "una materia"} no tiene un profesor válido`,
          message:
            "El profesor fue eliminado, desactivado o no pertenece a la escuela.",
          module: "Asignaciones",
          entityId: assignment.id,
        }),
      );

      continue;
    }

    if (
      !teacherSubjectsSet.has(
        `${teacher.id}-${assignment.subject_id}`,
      )
    ) {
      results.push(
        createValidationResult({
          id: `teacher-subject-invalid-${assignment.id}`,
          level: "error",
          title: `${getTeacherName(teacher)} no está autorizado para ${subject?.name ?? "esta materia"}`,
          message:
            "Configura la materia dentro del perfil del profesor.",
          module: "Profesores",
          entityId: teacher.id,
        }),
      );
    }

    if (
      !teacherShiftsMap.has(
        `${teacher.id}-${group.shift_id}`,
      )
    ) {
      results.push(
        createValidationResult({
          id: `teacher-shift-invalid-${assignment.id}`,
          level: "error",
          title: `${getTeacherName(teacher)} no trabaja en el turno del grupo ${group.name}`,
          message:
            "Configura el turno correspondiente dentro del perfil del profesor.",
          module: "Profesores",
          entityId: teacher.id,
        }),
      );
    }

    if (
      assignment.min_days_per_week >
      assignment.weekly_periods
    ) {
      results.push(
        createValidationResult({
          id: `invalid-min-days-${assignment.id}`,
          level: "error",
          title: `Configuración inválida en ${subject?.name ?? "una materia"}`,
          message:
            "El mínimo de días no puede superar la cantidad de horas semanales.",
          module: "Asignaciones",
          entityId: assignment.id,
        }),
      );
    }

    if (
      assignment.preferred_block_size >
      assignment.max_periods_per_day
    ) {
      results.push(
        createValidationResult({
          id: `invalid-block-size-${assignment.id}`,
          level: "error",
          title: `Bloque inválido en ${subject?.name ?? "una materia"}`,
          message:
            "El tamaño preferido del bloque supera el máximo permitido por día.",
          module: "Asignaciones",
          entityId: assignment.id,
        }),
      );
    }

        if (
      assignment.max_periods_per_day >
      assignment.weekly_periods
    ) {
      results.push(
        createValidationResult({
          id: `invalid-max-daily-${assignment.id}`,
          level: "error",
          title: `Máximo diario inválido en ${subject?.name ?? "una materia"}`,
          message:
            "El máximo de horas por día no puede superar las horas semanales.",
          module: "Asignaciones",
          entityId: assignment.id,
        }),
      );
    }

    if (
      !assignment.allow_consecutive_periods &&
      assignment.preferred_block_size > 1
    ) {
      results.push(
        createValidationResult({
          id: `invalid-consecutive-configuration-${assignment.id}`,
          level: "error",
          title: `Configuración contradictoria en ${subject?.name ?? "una materia"}`,
          message:
            "El bloque preferido es mayor que uno, pero las horas consecutivas están desactivadas.",
          module: "Asignaciones",
          entityId: assignment.id,
        }),
      );
    }

    const minimumDaysNeeded =
      Math.ceil(
        assignment.weekly_periods /
          assignment.max_periods_per_day,
      );

    if (
      assignment.min_days_per_week <
      minimumDaysNeeded
    ) {
      results.push(
        createValidationResult({
          id: `assignment-insufficient-days-${assignment.id}`,
          level: "warning",
          title: `La distribución de ${subject?.name ?? "una materia"} puede concentrarse demasiado`,
          message: `Con ${assignment.weekly_periods} horas y un máximo diario de ${assignment.max_periods_per_day}, se necesitan al menos ${minimumDaysNeeded} días para distribuirla.`,
          module: "Asignaciones",
          entityId: assignment.id,
        }),
      );
    }

    if (
      assignment.min_days_per_week >
      SCHOOL_DAYS.length
    ) {
      results.push(
        createValidationResult({
          id: `assignment-too-many-days-${assignment.id}`,
          level: "error",
          title: `Cantidad de días inválida en ${subject?.name ?? "una materia"}`,
          message: `La semana escolar solamente tiene ${SCHOOL_DAYS.length} días configurados.`,
          module: "Asignaciones",
          entityId: assignment.id,
        }),
      );
    }
  }
}

function validateTeacherLoads({
  results,
  teachers,
  assignmentsByTeacher,
  groupsById,
  shiftsById,
  teacherShiftsMap,
  shiftPeriodsByShift,
}) {
  for (const teacher of teachers) {
    const teacherAssignments =
      assignmentsByTeacher.get(teacher.id) ?? [];

    const weeklyLoad = sum(
      teacherAssignments.map(
        (assignment) =>
          assignment.weekly_periods,
      ),
    );
    const weeklyCapacityByDailyLimit =
      teacher.max_daily_periods *
      SCHOOL_DAYS.length;

    if (
      weeklyLoad >
      weeklyCapacityByDailyLimit
    ) {
      results.push(
        createValidationResult({
          id: `teacher-daily-limit-impossible-${teacher.id}`,
          level: "error",
          title: `${getTeacherName(teacher)} no puede cubrir su carga con su límite diario`,
          message: `Tiene ${weeklyLoad} horas semanales, pero con un máximo de ${teacher.max_daily_periods} por día solamente puede cubrir ${weeklyCapacityByDailyLimit} horas en ${SCHOOL_DAYS.length} días.`,
          module: "Profesores",
          entityId: teacher.id,
        }),
      );
    }
    if (
      weeklyLoad >
      teacher.max_weekly_periods
    ) {
      results.push(
        createValidationResult({
          id: `teacher-overload-${teacher.id}`,
          level: "error",
          title: `${getTeacherName(teacher)} supera su carga semanal`,
          message: `Tiene ${weeklyLoad} horas asignadas de un máximo de ${teacher.max_weekly_periods}.`,
          module: "Profesores",
          entityId: teacher.id,
        }),
      );
    } else if (
      teacher.max_weekly_periods - weeklyLoad <= 2 &&
      weeklyLoad > 0
    ) {
      results.push(
        createValidationResult({
          id: `teacher-near-capacity-${teacher.id}`,
          level: "warning",
          title: `${getTeacherName(teacher)} está cerca de su carga máxima`,
          message: `Tiene ${weeklyLoad} de ${teacher.max_weekly_periods} horas asignadas.`,
          module: "Profesores",
          entityId: teacher.id,
        }),
      );
    }

    const assignmentsByShift = groupBy(
      teacherAssignments,
      (assignment) =>
        groupsById.get(assignment.group_id)
          ?.shift_id ?? "unknown",
    );

    for (const [
      shiftId,
      shiftAssignments,
    ] of assignmentsByShift.entries()) {
      if (shiftId === "unknown") {
        continue;
      }

      const teacherShift =
        teacherShiftsMap.get(
          `${teacher.id}-${shiftId}`,
        );

      if (!teacherShift) {
        continue;
      }

      const shiftLoad = sum(
        shiftAssignments.map(
          (assignment) =>
            assignment.weekly_periods,
        ),
      );
      const shiftClassPeriods =
        getClassPeriodsByShift(
          shiftPeriodsByShift.get(
            shiftId,
          ) ?? [],
        );

      const maximumDailyHoursInShift =
        Math.min(
          teacher.max_daily_periods,
          shiftClassPeriods.length,
        );

      const weeklyShiftCapacity =
        maximumDailyHoursInShift *
        SCHOOL_DAYS.length;

      if (
        shiftLoad >
        weeklyShiftCapacity
      ) {
        const shift = shiftsById.get(
          shiftId,
        );

        results.push(
          createValidationResult({
            id: `teacher-shift-capacity-impossible-${teacher.id}-${shiftId}`,
            level: "error",
            title: `${getTeacherName(teacher)} no puede cubrir su carga en ${shift?.name ?? "el turno"}`,
            message: `Tiene ${shiftLoad} horas asignadas en este turno, pero su capacidad máxima es de ${weeklyShiftCapacity}.`,
            module: "Profesores",
            entityId: teacher.id,
          }),
        );
      }
      if (
        teacherShift.max_weekly_periods &&
        shiftLoad >
          teacherShift.max_weekly_periods
      ) {
        const shift = shiftsById.get(shiftId);

        results.push(
          createValidationResult({
            id: `teacher-shift-overload-${teacher.id}-${shiftId}`,
            level: "error",
            title: `${getTeacherName(teacher)} supera su carga en el turno ${shift?.name ?? ""}`,
            message: `Tiene ${shiftLoad} horas asignadas de un máximo de ${teacherShift.max_weekly_periods} para este turno.`,
            module: "Profesores",
            entityId: teacher.id,
          }),
        );
      }
    }
  }
}

function validateTeacherAvailability({
  results,
  teachers,
  assignmentsByTeacher,
  groupsById,
  shiftsById,
  shiftPeriodsByShift,
  availabilityMap,
}) {
  for (const teacher of teachers) {
    const teacherAssignments =
      assignmentsByTeacher.get(teacher.id) ?? [];

    if (teacherAssignments.length === 0) {
      results.push(
        createValidationResult({
          id: `teacher-without-assignments-${teacher.id}`,
          level: "info",
          title: `${getTeacherName(teacher)} no tiene clases asignadas`,
          message:
            "Este profesor no participará en la generación del horario actual.",
          module: "Profesores",
          entityId: teacher.id,
        }),
      );

      continue;
    }

    const assignedShiftIds = new Set(
      teacherAssignments
        .map(
          (assignment) =>
            groupsById.get(assignment.group_id)
              ?.shift_id,
        )
        .filter(Boolean),
    );

    let totalAvailableSlots = 0;
    let unavailableSlots = 0;
    let recordedCells = 0;

    for (const shiftId of assignedShiftIds) {
      const classPeriods = getClassPeriodsByShift(
        shiftPeriodsByShift.get(shiftId) ??
          [],
      );

      for (const day of SCHOOL_DAYS) {
        for (const period of classPeriods) {
          const availability =
            availabilityMap.get(
              createAvailabilityKey(
                teacher.id,
                day.value,
                period.id,
              ),
            );

          if (availability) {
            recordedCells += 1;
          }

          if (
            availability?.availability_type ===
            "unavailable"
          ) {
            unavailableSlots += 1;
          } else {
            totalAvailableSlots += 1;
          }
        }
      }
    }

    const requiredSlots = sum(
      teacherAssignments.map(
        (assignment) =>
          assignment.weekly_periods,
      ),
    );

    if (totalAvailableSlots < requiredSlots) {
      results.push(
        createValidationResult({
          id: `teacher-insufficient-availability-${teacher.id}`,
          level: "error",
          title: `${getTeacherName(teacher)} no tiene suficiente disponibilidad`,
          message: `Tiene ${requiredSlots} clases semanales asignadas, pero solamente ${totalAvailableSlots} espacios utilizables.`,
          module: "Disponibilidad",
          entityId: teacher.id,
          details: {
            requiredSlots,
            totalAvailableSlots,
            unavailableSlots,
          },
        }),
      );
    } else if (recordedCells === 0) {
      results.push(
        createValidationResult({
          id: `teacher-without-availability-${teacher.id}`,
          level: "warning",
          title: `${getTeacherName(teacher)} no tiene preferencias registradas`,
          message:
            "Todas sus horas se interpretarán como disponibles.",
          module: "Disponibilidad",
          entityId: teacher.id,
        }),
      );
    } else if (
      totalAvailableSlots - requiredSlots <= 2
    ) {
      results.push(
        createValidationResult({
          id: `teacher-tight-availability-${teacher.id}`,
          level: "warning",
          title: `${getTeacherName(teacher)} tiene disponibilidad muy limitada`,
          message: `Solamente quedan ${totalAvailableSlots - requiredSlots} espacios de margen respecto a sus clases asignadas.`,
          module: "Disponibilidad",
          entityId: teacher.id,
        }),
      );
    }

    for (const shiftId of assignedShiftIds) {
      if (!shiftsById.has(shiftId)) {
        results.push(
          createValidationResult({
            id: `teacher-invalid-shift-${teacher.id}-${shiftId}`,
            level: "error",
            title: `${getTeacherName(teacher)} tiene una asignación en un turno inválido`,
            message:
              "El turno fue eliminado o está inactivo.",
            module: "Turnos",
            entityId: teacher.id,
          }),
        );
      }
    }
  }
}

function createValidationResponse({
  school,
  activeAcademicPeriod,
  results,
  statistics,
}) {
  const errors = results.filter(
    (result) => result.level === "error",
  );

  const warnings = results.filter(
    (result) => result.level === "warning",
  );

  const successes = results.filter(
    (result) => result.level === "success",
  );

  const information = results.filter(
    (result) => result.level === "info",
  );

  return {
    school,
    activeAcademicPeriod,
    results,
    errors,
    warnings,
    successes,
    information,
    statistics,
    canGenerate: errors.length === 0,
    checkedAt: new Date().toISOString(),
  };
}