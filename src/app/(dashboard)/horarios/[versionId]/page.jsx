import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Gauge, Layers3 } from "lucide-react";
import TeacherAvailabilityComparison from "@/components/schedules/TeacherAvailabilityComparison";
import EditableScheduleGrid from "@/components/schedules/editable/EditableScheduleGrid";
import ExportSchedulePdfButton from "@/components/schedules/ExportSchedulePdfButton";
import GeneralScheduleGrid from "@/components/schedules/GeneralScheduleGrid";
import ScheduleDefaultSelection from "@/components/schedules/ScheduleDefaultSelection";
import ScheduleEntitySelector from "@/components/schedules/ScheduleEntitySelector";
import ScheduleVersionActions from "@/components/schedules/ScheduleVersionActions";
import ScheduleVersionStatus from "@/components/schedules/ScheduleVersionStatus";
import ScheduleViewSelector from "@/components/schedules/ScheduleViewSelector";
import Alert from "@/components/ui/Alert";
import ReoptimizeScheduleButton from "@/lib/scheduler/ReoptimizeScheduleButton";
import {
  groupPeriodsByShift,
  normalizeRelation,
} from "@/lib/scheduler/scheduleView";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Horario generado",
};

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) {
    return "Fecha desconocida";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(value));
}

function logSupabaseError(title, error) {
  if (!error) {
    return;
  }

  console.error(
    [
      title,
      `Message: ${error.message ?? "Sin mensaje"}`,
      `Details: ${error.details ?? "Sin detalles"}`,
      `Hint: ${error.hint ?? "Sin sugerencia"}`,
      `Code: ${error.code ?? "Sin código"}`,
    ].join("\n"),
  );
}

function getSelectedView(value) {
  if (value === "teacher") {
    return "teacher";
  }

  if (value === "general") {
    return "general";
  }

  return "group";
}

function sortGroups(firstGroup, secondGroup) {
  const firstGradeOrder =
    firstGroup.grade_level?.order_number ?? Number.MAX_SAFE_INTEGER;

  const secondGradeOrder =
    secondGroup.grade_level?.order_number ?? Number.MAX_SAFE_INTEGER;

  if (firstGradeOrder !== secondGradeOrder) {
    return firstGradeOrder - secondGradeOrder;
  }

  return String(firstGroup.name ?? "").localeCompare(
    String(secondGroup.name ?? ""),
    "es",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function normalizeWorkshopColor(value) {
  if (typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value;
  }

  return "#f59e0b";
}

export default async function ScheduleVersionPage({ params, searchParams }) {
  const { versionId } = await params;
  const query = await searchParams;

  const selectedView = getSelectedView(query?.vista);

  const requestedGroupId =
    typeof query?.grupo === "string" ? query.grupo : null;

  const requestedTeacherId =
    typeof query?.profesor === "string" ? query.profesor : null;

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  /*
   * Primero se consulta la versión porque su
   * academic_period_id se necesita para cargar
   * los grupos del ciclo correcto.
   */
  const { data: version, error: versionError } = await supabase
    .from("schedule_versions")
    .select(
      `
      id,
      school_id,
      academic_period_id,
      source_version_id,
      name,
      status,
      solver_status,
      objective_value,
      solver_statistics,
      warnings,
      published_at,
      created_at
    `,
    )
    .eq("id", versionId)
    .eq("school_id", school.id)
    .maybeSingle();

  logSupabaseError("Error obteniendo versión:", versionError);

  if (!version) {
    notFound();
  }

  const [
    { data: academicPeriod, error: academicPeriodError },
    { data: groups, error: groupsError },
    { data: teachers, error: teachersError },
    { data: periods, error: periodsError },
    { count: totalEntriesCount, error: totalEntriesCountError },
    { count: lockedEntriesCount, error: lockedEntriesCountError },
  ] = await Promise.all([
    supabase
      .from("academic_periods")
      .select(
        `
        id,
        name,
        start_date,
        end_date
      `,
      )
      .eq("id", version.academic_period_id)
      .eq("school_id", school.id)
      .maybeSingle(),

    supabase
      .from("groups")
      .select(
        `
        id,
        name,
        academic_period_id,
        grade_level_id,
        shift_id,
        active,

        grade_level:grade_levels (
          id,
          name,
          order_number
        ),

        shift:shifts (
          id,
          name,
          start_time,
          end_time
        )
      `,
      )
      .eq("school_id", school.id)
      .eq("academic_period_id", version.academic_period_id)
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("teachers")
      .select(
        `
        id,
        first_name,
        last_name,
        employee_number,
        active
      `,
      )
      .eq("school_id", school.id)
      .order("last_name", {
        ascending: true,
      })
      .order("first_name", {
        ascending: true,
      }),

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
        active,

        shift:shifts (
          id,
          name,
          start_time,
          end_time
        )
      `,
      )
      .eq("school_id", school.id)
      .eq("active", true)
      .order("period_number", {
        ascending: true,
      }),

    /*
     * El conteo de integridad incluye únicamente
     * clases académicas. Los talleres y servicios
     * no cuentan como clases del solver.
     */
    supabase
      .from("schedule_entries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("schedule_version_id", version.id),

    supabase
      .from("schedule_entries")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("school_id", school.id)
      .eq("schedule_version_id", version.id)
      .eq("locked", true),
  ]);

  logSupabaseError("Error obteniendo ciclo escolar:", academicPeriodError);

  logSupabaseError("Error obteniendo grupos:", groupsError);

  logSupabaseError("Error obteniendo profesores:", teachersError);

  logSupabaseError("Error obteniendo horas:", periodsError);

  logSupabaseError("Error contando clases:", totalEntriesCountError);

  logSupabaseError(
    "Error contando clases bloqueadas:",
    lockedEntriesCountError,
  );

  const normalizedGroups = (groups ?? [])
    .map((group) => ({
      ...group,

      grade_level: normalizeRelation(group.grade_level),

      shift: normalizeRelation(group.shift),
    }))
    .sort(sortGroups);

  const normalizedTeachers = (teachers ?? []).filter(
    (teacher) => teacher.active,
  );

  const normalizedPeriods = (periods ?? []).map((period) => ({
    ...period,

    shift: normalizeRelation(period.shift),
  }));

  const selectedGroupId =
    requestedGroupId &&
    normalizedGroups.some((group) => group.id === requestedGroupId)
      ? requestedGroupId
      : (normalizedGroups[0]?.id ?? null);

  const selectedTeacherId =
    requestedTeacherId &&
    normalizedTeachers.some((teacher) => teacher.id === requestedTeacherId)
      ? requestedTeacherId
      : (normalizedTeachers[0]?.id ?? null);

  /*
   * Etiquetas administrativas Libre/Servicio.
   * Solamente se consultan en la vista del profesor.
   */
  let teacherSlotLabels = [];
  let teacherSlotLabelsError = null;

  if (selectedView === "teacher" && selectedTeacherId) {
    const { data: teacherSlotLabelsData, error: slotLabelsError } =
      await supabase
        .from("schedule_teacher_slot_labels")
        .select(
          `
        id,
        teacher_id,
        day_of_week,
        shift_period_id,
        label
      `,
        )
        .eq("school_id", school.id)
        .eq("schedule_version_id", version.id)
        .eq("teacher_id", selectedTeacherId);

    teacherSlotLabelsError = slotLabelsError;

    logSupabaseError(
      "Error obteniendo etiquetas del profesor:",
      teacherSlotLabelsError,
    );

    teacherSlotLabels = teacherSlotLabelsData ?? [];
  }

  const selectedGroup =
    normalizedGroups.find((group) => group.id === selectedGroupId) ?? null;

  const selectedTeacher =
    normalizedTeachers.find((teacher) => teacher.id === selectedTeacherId) ??
    null;
  let comparisonTeacherShifts = [];
  let comparisonAvailability = [];

  if (selectedView === "teacher" && selectedTeacher && academicPeriod) {
    const [
      { data: teacherShiftsData, error: comparisonShiftsError },
      { data: availabilityData, error: comparisonAvailabilityError },
    ] = await Promise.all([
      supabase
        .from("teacher_shifts")
        .select(
          `
        id,
        max_weekly_periods,

        shift:shifts (
          id,
          name,
          start_time,
          end_time,

          shift_periods (
            id,
            period_number,
            name,
            start_time,
            end_time,
            period_type,
            active
          )
        )
      `,
        )
        .eq("school_id", school.id)
        .eq("teacher_id", selectedTeacher.id),

      supabase
        .from("teacher_availability")
        .select(
          `
        id,
        day_of_week,
        shift_period_id,
        availability_type,
        weight,
        notes
      `,
        )
        .eq("school_id", school.id)
        .eq("academic_period_id", academicPeriod.id)
        .eq("teacher_id", selectedTeacher.id),
    ]);

    logSupabaseError(
      "Error obteniendo turnos para la comparativa:",
      comparisonShiftsError,
    );

    logSupabaseError(
      "Error obteniendo disponibilidad para la comparativa:",
      comparisonAvailabilityError,
    );

    comparisonTeacherShifts = (teacherShiftsData ?? [])
      .map((teacherShift) => ({
        ...teacherShift,

        shift: {
          ...normalizeRelation(teacherShift.shift),

          shift_periods: [
            ...(normalizeRelation(teacherShift.shift)?.shift_periods ?? []),
          ].sort((first, second) => first.period_number - second.period_number),
        },
      }))
      .sort((first, second) =>
        String(first.shift?.start_time ?? "").localeCompare(
          String(second.shift?.start_time ?? ""),
        ),
      );

    comparisonAvailability = availabilityData ?? [];
  }
  let selectedPdfEntity = null;

  if (selectedView === "group" && selectedGroup) {
    selectedPdfEntity = {
      id: selectedGroup.id,

      name: selectedGroup.name,

      secondaryText: [
        selectedGroup.grade_level?.name,

        selectedGroup.shift?.name ? `Turno ${selectedGroup.shift.name}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (selectedView === "teacher" && selectedTeacher) {
    selectedPdfEntity = {
      id: selectedTeacher.id,

      name: [selectedTeacher.first_name, selectedTeacher.last_name]
        .filter(Boolean)
        .join(" "),

      secondaryText: selectedTeacher.employee_number
        ? `Número de empleado: ${selectedTeacher.employee_number}`
        : "Profesor",
    };
  }

  /*
   * Consulta de clases normales.
   */
  let entriesQuery = supabase
    .from("schedule_entries")
    .select(
      `
      id,
      teaching_assignment_id,
      group_id,
      subject_id,
      teacher_id,
      day_of_week,
      shift_period_id,
      occurrence_number,
      locked,

      teaching_assignment:teaching_assignments (
        id,
        group_id,
        subject_id,
        teacher_id,

        group:groups (
          id,
          name,
          academic_period_id,
          shift_id,

          grade_level:grade_levels (
            id,
            name,
            order_number
          ),

          shift:shifts (
            id,
            name,
            start_time,
            end_time
          )
        ),

        subject:subjects (
          id,
          name,
          code,
          color
        ),

        teacher:teachers (
          id,
          first_name,
          last_name,
          employee_number
        )
      )
    `,
    )
    .eq("school_id", school.id)
    .eq("schedule_version_id", version.id);

  if (selectedView === "group" && selectedGroupId) {
    entriesQuery = entriesQuery.eq("group_id", selectedGroupId);
  }

  if (selectedView === "teacher" && selectedTeacherId) {
    entriesQuery = entriesQuery.eq("teacher_id", selectedTeacherId);
  }

  /*
   * Consulta de talleres guardados como snapshot.
   *
   * En la vista de profesor no se consultan porque
   * el taller no pertenece a ningún profesor.
   */
  let fixedEntriesPromise = Promise.resolve({
    data: [],
    error: null,
  });

  if (selectedView !== "teacher") {
    let fixedEntriesQuery = supabase
      .from("schedule_fixed_entries")
      .select(
        `
        id,
        schedule_version_id,
        source_fixed_period_id,
        block_id,
        group_id,
        day_of_week,
        shift_period_id,
        slot_order,
        activity_type,
        label,
        color,
        locked
      `,
      )
      .eq("school_id", school.id)
      .eq("schedule_version_id", version.id)
      .eq("activity_type", "workshop")
      .order("slot_order", {
        ascending: true,
      });

    if (selectedView === "group" && selectedGroupId) {
      fixedEntriesQuery = fixedEntriesQuery.eq("group_id", selectedGroupId);
    }

    fixedEntriesPromise = fixedEntriesQuery;
  }

  const [
    { data: scheduleEntries, error: entriesError },
    { data: fixedEntries, error: fixedEntriesError },
  ] = await Promise.all([entriesQuery, fixedEntriesPromise]);

  logSupabaseError("Error obteniendo entradas del horario:", entriesError);

  logSupabaseError("Error obteniendo talleres del horario:", fixedEntriesError);

  const normalizedEntries = (scheduleEntries ?? []).map((entry) => {
    const teachingAssignment = normalizeRelation(entry.teaching_assignment);

    const normalizedGroup = normalizeRelation(teachingAssignment?.group);

    const normalizedSubject = normalizeRelation(teachingAssignment?.subject);

    const normalizedTeacher = normalizeRelation(teachingAssignment?.teacher);

    return {
      ...entry,

      group_id: entry.group_id ?? teachingAssignment?.group_id ?? null,

      subject_id: entry.subject_id ?? teachingAssignment?.subject_id ?? null,

      teacher_id: entry.teacher_id ?? teachingAssignment?.teacher_id ?? null,

      subject: normalizedSubject,

      teacher: normalizedTeacher,

      group: normalizedGroup
        ? {
            ...normalizedGroup,

            grade_level: normalizeRelation(normalizedGroup.grade_level),

            shift: normalizeRelation(normalizedGroup.shift),
          }
        : null,
    };
  });

  const groupsById = new Map(
    normalizedGroups.map((group) => [group.id, group]),
  );

  /*
   * Aunque en la base de datos exista otro texto,
   * visualmente siempre se muestra como Taller.
   */
  const normalizedFixedEntries = (fixedEntries ?? []).map((fixedEntry) => ({
    ...fixedEntry,

    label: "Taller",

    activity_type: "workshop",

    color: normalizeWorkshopColor(fixedEntry.color),

    locked: true,

    group: groupsById.get(fixedEntry.group_id) ?? null,
  }));

  let relevantShiftIds = new Set();

  if (selectedView === "group" && selectedGroup?.shift?.id) {
    relevantShiftIds = new Set([selectedGroup.shift.id]);
  }

  if (selectedView === "teacher") {
    /*
     * Los turnos relevantes se obtienen tanto de
     * las clases como de las horas marcadas Servicio.
     */
    const shiftIdByPeriodId = new Map(
      normalizedPeriods.map((period) => [period.id, period.shift_id]),
    );

    const classShiftIds = normalizedEntries
      .map((entry) => entry.group?.shift?.id)
      .filter(Boolean);

    const serviceShiftIds = teacherSlotLabels
      .map((slotLabel) => shiftIdByPeriodId.get(slotLabel.shift_period_id))
      .filter(Boolean);

    relevantShiftIds = new Set([...classShiftIds, ...serviceShiftIds]);
  }

  if (selectedView === "general") {
    relevantShiftIds = new Set(
      normalizedGroups.map((group) => group.shift?.id).filter(Boolean),
    );
  }

  const relevantPeriods =
    relevantShiftIds.size > 0
      ? normalizedPeriods.filter((period) =>
          relevantShiftIds.has(period.shift_id),
        )
      : normalizedPeriods;

  const shifts = groupPeriodsByShift(relevantPeriods);

  const statistics = version.solver_statistics ?? {};

  const expectedEntriesCount = Number(
    statistics.total_required_entries ??
      statistics.scheduled_entries ??
      statistics.total_entries ??
      0,
  );

  const actualEntriesCount = totalEntriesCount ?? 0;

  const versionHasNoEntries = actualEntriesCount === 0;

  const versionHasMissingEntries =
    expectedEntriesCount > 0 && actualEntriesCount !== expectedEntriesCount;

  const versionIntegrityValid =
    !totalEntriesCountError &&
    !versionHasNoEntries &&
    !versionHasMissingEntries;

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/horarios"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft size={17} />
          Volver a horarios
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <CalendarDays size={25} />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Versión generada
              </p>

              <h2 className="mt-1 text-3xl font-bold text-slate-950">
                {version.name || "Horario escolar"}
              </h2>

              <p className="mt-2 text-slate-600">
                Generado el {formatDate(version.created_at)}
              </p>

              {academicPeriod?.name && (
                <p className="mt-1 text-sm text-slate-500">
                  Ciclo escolar: {academicPeriod.name}
                </p>
              )}
            </div>
          </div>

          <ScheduleVersionStatus status={version.status} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estado del solver</p>

          <p className="mt-2 text-xl font-bold capitalize text-slate-950">
            {version.solver_status || "Sin estado"}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Gauge size={16} />
            Puntuación
          </p>

          <p className="mt-2 text-xl font-bold text-slate-950">
            {version.objective_value ?? "—"}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Layers3 size={16} />
            Clases colocadas
          </p>

          <p className="mt-2 text-xl font-bold text-slate-950">
            {actualEntriesCount}
          </p>

          {expectedEntriesCount > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Esperadas: {expectedEntriesCount}
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tiempo del solver</p>

          <p className="mt-2 text-xl font-bold text-slate-950">
            {typeof statistics.wall_time_seconds === "number"
              ? `${statistics.wall_time_seconds.toFixed(3)} s`
              : "—"}
          </p>
        </article>
      </section>

      {!versionIntegrityValid && (
        <Alert type="error">
          <div>
            <p className="font-semibold">Esta versión está incompleta</p>

            {versionHasNoEntries ? (
              <p className="mt-1">
                La versión no contiene ninguna clase guardada. No debe
                publicarse ni reoptimizarse.
              </p>
            ) : versionHasMissingEntries ? (
              <p className="mt-1">
                El solver reportó {expectedEntriesCount} clases, pero Supabase
                contiene {actualEntriesCount}.
              </p>
            ) : (
              <p className="mt-1">
                No fue posible comprobar la integridad de esta versión.
              </p>
            )}

            <p className="mt-2 text-sm">
              Puedes eliminar esta versión y generar una nueva después de
              corregir el problema.
            </p>
          </div>
        </Alert>
      )}

      {fixedEntriesError && (
        <Alert type="error">
          <div>
            <p className="font-semibold">No fue posible cargar los talleres</p>

            <p className="mt-1">
              Las clases pueden mostrarse, pero los espacios de taller podrían
              aparecer como libres.
            </p>
          </div>
        </Alert>
      )}

      {selectedView === "teacher" && teacherSlotLabelsError && (
        <Alert type="error">
          <div>
            <p className="font-semibold">
              No fue posible cargar Libre y Servicio
            </p>

            <p className="mt-1">
              El horario puede mostrarse, pero las horas administrativas del
              profesor no están disponibles.
            </p>
          </div>
        </Alert>
      )}

      <section className="flex flex-wrap items-center gap-3">
        <ScheduleVersionActions
          version={version}
          integrityValid={versionIntegrityValid}
        />

        {versionIntegrityValid && (
          <ReoptimizeScheduleButton
            versionId={version.id}
            versionStatus={version.status}
            lockedEntriesCount={lockedEntriesCount ?? 0}
          />
        )}

        <ExportSchedulePdfButton
          schoolName={school.name}
          academicPeriodName={academicPeriod?.name}
          versionName={version.name}
          view={selectedView}
          selectedEntity={selectedPdfEntity}
          shifts={shifts}
          groups={normalizedGroups}
          entries={normalizedEntries}
          fixedEntries={normalizedFixedEntries}
          teacherSlotLabels={teacherSlotLabels}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <ScheduleViewSelector selectedView={selectedView} />

          {selectedView !== "general" ? (
            <ScheduleEntitySelector
              view={selectedView}
              groups={normalizedGroups}
              teachers={normalizedTeachers}
              selectedEntityId={
                selectedView === "group" ? selectedGroupId : selectedTeacherId
              }
            />
          ) : (
            <div className="max-w-xl rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              La vista general muestra grupo, materia, profesor y talleres
              fijos. En versiones en borrador puedes arrastrar una clase hacia
              otro espacio libre del mismo grupo.
            </div>
          )}
        </div>
      </section>

      {selectedView === "group" && selectedGroup && (
        <section className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Horario del grupo
          </p>

          <h3 className="mt-2 text-2xl font-bold">{selectedGroup.name}</h3>

          <p className="mt-1 text-sm text-slate-300">
            {selectedGroup.grade_level?.name || "Sin grado"} ·{" "}
            {selectedGroup.shift?.name || "Sin turno"}
          </p>
        </section>
      )}

      {selectedView === "teacher" && selectedTeacher && (
        <section className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Horario del profesor
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {selectedTeacher.first_name} {selectedTeacher.last_name}
          </h3>

          <p className="mt-1 text-sm text-slate-300">
            {selectedTeacher.employee_number || "Sin número de empleado"}
          </p>
        </section>
      )}

      {selectedView !== "general" && (
        <ScheduleDefaultSelection
          view={selectedView}
          selectedEntityId={
            selectedView === "group" ? selectedGroupId : selectedTeacherId
          }
        />
      )}

      {selectedView === "general" ? (
        <GeneralScheduleGrid
          versionId={version.id}
          versionStatus={version.status}
          shifts={shifts}
          groups={normalizedGroups}
          entries={normalizedEntries}
          fixedEntries={normalizedFixedEntries}
        />
      ) : (
        <div className="space-y-8">
          <EditableScheduleGrid
            versionId={version.id}
            versionStatus={version.status}
            shifts={shifts}
            entries={normalizedEntries}
            fixedEntries={normalizedFixedEntries}
            view={selectedView}
            teacherId={selectedView === "teacher" ? selectedTeacherId : null}
            teacherSlotLabels={teacherSlotLabels}
          />

          {selectedView === "teacher" && selectedTeacher && (
            <TeacherAvailabilityComparison
              teacher={selectedTeacher}
              teacherShifts={comparisonTeacherShifts}
              availability={comparisonAvailability}
            />
          )}
        </div>
      )}
    </div>
  );
}
