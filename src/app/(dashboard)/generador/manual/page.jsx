import { ArrowLeft, CalendarPlus2, PencilRuler } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createManualScheduleVersionAction } from "@/app/(dashboard)/generador/manual/actions";
import ManualScheduleBuilder from "@/components/generator/manual/ManualScheduleBuilder";
import {
  groupPeriodsByShift,
  normalizeRelation,
} from "@/lib/scheduler/scheduleView";
import { getCurrentSchool } from "@/lib/school/getCurrentSchool";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Constructor manual",
};

export const dynamic = "force-dynamic";

function getTeacherName(teacher) {
  return [teacher.first_name, teacher.last_name].filter(Boolean).join(" ");
}

export default async function ManualGeneratorPage({ searchParams }) {
  const query = await searchParams;

  const requestedVersionId =
    typeof query?.version === "string" ? query.version : null;

  const requestedTeacherId =
    typeof query?.profesor === "string" ? query.profesor : null;

  const { school } = await getCurrentSchool();

  const supabase = await createClient();

  /*
   * Ciclo escolar activo.
   */
  const { data: academicPeriod, error: academicPeriodError } = await supabase
    .from("academic_periods")
    .select(
      `
      id,
      name,
      active
    `,
    )
    .eq("school_id", school.id)
    .eq("active", true)
    .maybeSingle();

  if (academicPeriodError) {
    console.error("Error obteniendo ciclo escolar:", academicPeriodError);
  }

  if (!academicPeriod) {
    return (
      <div className="space-y-6">
        <Link
          href="/generador"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
        >
          <ArrowLeft size={17} />
          Volver al generador
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          No existe un ciclo escolar activo.
        </div>
      </div>
    );
  }

  /*
   * Si todavía no seleccionó una
   * versión, mostramos la pantalla
   * para crear un lienzo nuevo.
   */
  if (!requestedVersionId) {
    const { data: versions, error: versionsError } = await supabase
      .from("schedule_versions")
      .select(
        `
        id,
        name,
        status,
        solver_statistics,
        created_at
      `,
      )
      .eq("school_id", school.id)
      .eq("academic_period_id", academicPeriod.id)
      .eq("status", "draft")
      .order("created_at", {
        ascending: false,
      });

    if (versionsError) {
      console.error("Error obteniendo horarios manuales:", versionsError);
    }

    const manualVersions = (versions ?? []).filter(
      (version) => version.solver_statistics?.mode === "manual",
    );

    return (
      <div className="space-y-8">
        <Link
          href="/generador"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft size={17} />
          Volver al generador
        </Link>

        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Construcción manual
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            Lienzo de horario
          </h2>

          <p className="mt-2 max-w-3xl text-slate-600">
            Crea el horario profesor por profesor seleccionando directamente qué
            grupo y materia ocuparán cada hora.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-slate-950 p-3 text-white">
              <PencilRuler size={22} />
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-950">
                Crear un lienzo vacío
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Ciclo escolar: {academicPeriod.name}
              </p>

              <form
                action={createManualScheduleVersionAction}
                className="mt-5 space-y-4"
              >
                <div>
                  <label
                    htmlFor="manual-schedule-name"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Nombre de la versión
                  </label>

                  <input
                    id="manual-schedule-name"
                    name="name"
                    type="text"
                    defaultValue={`Horario manual ${academicPeriod.name}`}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <CalendarPlus2 size={18} />
                  Crear lienzo vacío
                </button>
              </form>
            </div>
          </div>
        </section>

        {manualVersions.length > 0 && (
          <section className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-slate-950">
                Continuar un horario manual
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Puedes continuar cualquiera de los borradores que todavía no has
                publicado.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {manualVersions.map((version) => (
                <Link
                  key={version.id}
                  href={`/generador/manual?version=${version.id}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
                >
                  <p className="font-bold text-slate-950">{version.name}</p>

                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
                    Borrador
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  /*
   * ==========================================================
   * CARGAR LA VERSIÓN MANUAL
   * ==========================================================
   */

  const { data: version, error: versionError } = await supabase
    .from("schedule_versions")
    .select(
      `
      id,
      name,
      status,
      academic_period_id,
      solver_statistics
    `,
    )
    .eq("id", requestedVersionId)
    .eq("school_id", school.id)
    .maybeSingle();

  if (versionError) {
    console.error("Error obteniendo versión manual:", versionError);
  }

  if (
    !version ||
    version.academic_period_id !== academicPeriod.id ||
    version.solver_statistics?.mode !== "manual"
  ) {
    notFound();
  }

  const [
    { data: teachers, error: teachersError },
    { data: groups, error: groupsError },
    { data: subjects, error: subjectsError },
    { data: assignments, error: assignmentsError },
    { data: periods, error: periodsError },
    { data: entries, error: entriesError },
    { data: fixedEntries, error: fixedEntriesError },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select(
        `
          id,
          first_name,
          last_name,
          active
        `,
      )
      .eq("school_id", school.id)
      .eq("active", true)
      .order("last_name", {
        ascending: true,
      }),

    supabase
      .from("groups")
      .select(
        `
          id,
          name,
          shift_id,
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
      .eq("academic_period_id", academicPeriod.id)
      .eq("active", true),

    supabase
      .from("subjects")
      .select(
        `
          id,
          name,
          code,
          active
        `,
      )
      .eq("school_id", school.id)
      .eq("active", true),

    supabase
      .from("teaching_assignments")
      .select(
        `
          id,
          group_id,
          subject_id,
          teacher_id,
          weekly_periods,
          max_periods_per_day
        `,
      )
      .eq("school_id", school.id)
      .eq("academic_period_id", academicPeriod.id),

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
     * Todas las clases de la versión.
     *
     * Son necesarias para saber qué
     * grupos ya están ocupados mientras
     * cambiamos de profesor.
     */
    supabase
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
          locked
        `,
      )
      .eq("school_id", school.id)
      .eq("schedule_version_id", version.id),

    supabase
      .from("schedule_fixed_entries")
      .select(
        `
          id,
          group_id,
          day_of_week,
          shift_period_id,
          activity_type,
          label
        `,
      )
      .eq("school_id", school.id)
      .eq("schedule_version_id", version.id),
  ]);

  const errors = [
    teachersError,
    groupsError,
    subjectsError,
    assignmentsError,
    periodsError,
    entriesError,
    fixedEntriesError,
  ].filter(Boolean);

  if (errors.length) {
    console.error("Error cargando constructor manual:", errors);
  }

  const normalizedGroups = (groups ?? []).map((group) => ({
    ...group,

    shift: normalizeRelation(group.shift),
  }));

  const groupsById = new Map(
    normalizedGroups.map((group) => [group.id, group]),
  );

  const subjectsById = new Map(
    (subjects ?? []).map((subject) => [subject.id, subject]),
  );

  /*
   * Solamente asignaciones cuyos
   * grupo y materia siguen activos.
   */
  const normalizedAssignments = (assignments ?? [])
    .map((assignment) => ({
      ...assignment,

      group: groupsById.get(assignment.group_id) ?? null,

      subject: subjectsById.get(assignment.subject_id) ?? null,
    }))
    .filter((assignment) => assignment.group && assignment.subject);

  /*
   * Solamente profesores que realmente
   * tienen asignaciones.
   */
  const teacherIdsWithAssignments = new Set(
    normalizedAssignments.map((assignment) => assignment.teacher_id),
  );

  const availableTeachers = (teachers ?? []).filter((teacher) =>
    teacherIdsWithAssignments.has(teacher.id),
  );

  const selectedTeacherId =
    requestedTeacherId &&
    availableTeachers.some((teacher) => teacher.id === requestedTeacherId)
      ? requestedTeacherId
      : (availableTeachers[0]?.id ?? null);

  const selectedTeacher =
    availableTeachers.find((teacher) => teacher.id === selectedTeacherId) ??
    null;

  const selectedAssignments = normalizedAssignments.filter(
    (assignment) => assignment.teacher_id === selectedTeacherId,
  );

  /*
   * Agregamos grupo y materia a cada
   * schedule_entry para que el componente
   * no tenga que hacer búsquedas.
   */
  const assignmentsById = new Map(
    normalizedAssignments.map((assignment) => [assignment.id, assignment]),
  );

  const normalizedEntries = (entries ?? []).map((entry) => {
    const assignment = assignmentsById.get(entry.teaching_assignment_id);

    return {
      ...entry,

      group_id: entry.group_id ?? assignment?.group_id ?? null,

      subject_id: entry.subject_id ?? assignment?.subject_id ?? null,

      teacher_id: entry.teacher_id ?? assignment?.teacher_id ?? null,

      group: assignment?.group ?? groupsById.get(entry.group_id) ?? null,

      subject:
        assignment?.subject ?? subjectsById.get(entry.subject_id) ?? null,
    };
  });

  /*
   * Horas correspondientes únicamente a
   * los turnos de los grupos que imparte
   * este profesor.
   */
  const relevantShiftIds = new Set(
    selectedAssignments
      .map((assignment) => assignment.group?.shift_id)
      .filter(Boolean),
  );

  const normalizedPeriods = (periods ?? []).map((period) => ({
    ...period,

    shift: normalizeRelation(period.shift),
  }));

  const relevantPeriods = normalizedPeriods.filter((period) =>
    relevantShiftIds.has(period.shift_id),
  );

  const shifts = groupPeriodsByShift(relevantPeriods);

  /*
   * Disponibilidad del profesor elegido.
   */
  let availability = [];

  if (selectedTeacherId) {
    const { data: availabilityData, error: availabilityError } = await supabase
      .from("teacher_availability")
      .select(
        `
        id,
        teacher_id,
        day_of_week,
        shift_period_id,
        availability_type,
        weight
      `,
      )
      .eq("school_id", school.id)
      .eq("academic_period_id", academicPeriod.id)
      .eq("teacher_id", selectedTeacherId);

    if (availabilityError) {
      console.error("Error obteniendo disponibilidad:", availabilityError);
    }

    availability = availabilityData ?? [];
  }

  return (
    <div className="space-y-6">
      <Link
        href="/generador"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft size={17} />
        Volver al generador
      </Link>

      <ManualScheduleBuilder
        version={version}
        teachers={availableTeachers}
        selectedTeacher={selectedTeacher}
        assignments={selectedAssignments}
        shifts={shifts}
        entries={normalizedEntries}
        fixedEntries={fixedEntries ?? []}
        availability={availability}
      />
    </div>
  );
}
