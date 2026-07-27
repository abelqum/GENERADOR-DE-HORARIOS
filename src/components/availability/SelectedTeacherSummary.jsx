import {
  BookOpenCheck,
  Clock3,
  DoorOpen,
  GraduationCap,
  UserRound,
} from "lucide-react";

function normalizeRelation(value) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getSubjectName(assignment) {
  const subject = normalizeRelation(assignment.subject);

  return subject?.name || "Materia sin nombre";
}

function getSubjectColor(assignment) {
  const subject = normalizeRelation(assignment.subject);

  return subject?.color || "#64748b";
}

function getGroupName(assignment) {
  const group = normalizeRelation(assignment.group);

  const gradeLevel = normalizeRelation(group?.grade_level);

  if (!group) {
    return "Grupo sin especificar";
  }

  return [gradeLevel?.name, group.name].filter(Boolean).join(" · ");
}

function groupAssignmentsBySubject(assignments) {
  const subjectsMap = new Map();

  assignments.forEach((assignment) => {
    const subject = normalizeRelation(assignment.subject);

    const subjectId =
      subject?.id ?? assignment.subject_id ?? `unknown-${assignment.id}`;

    if (!subjectsMap.has(subjectId)) {
      subjectsMap.set(subjectId, {
        id: subjectId,
        name: getSubjectName(assignment),
        color: getSubjectColor(assignment),
        groups: new Map(),
      });
    }

    const subjectRecord = subjectsMap.get(subjectId);

    const group = normalizeRelation(assignment.group);

    const groupId =
      group?.id ?? assignment.group_id ?? `unknown-group-${assignment.id}`;

    subjectRecord.groups.set(groupId, getGroupName(assignment));
  });

  return Array.from(subjectsMap.values()).map((subject) => ({
    ...subject,
    groups: Array.from(subject.groups.values()).sort((first, second) =>
      first.localeCompare(second, "es", {
        numeric: true,
        sensitivity: "base",
      }),
    ),
  }));
}

export default function SelectedTeacherSummary({
  teacher,
  teacherShifts = [],
  teachingAssignments = [],
}) {
  if (!teacher) {
    return null;
  }

  const assignedSubjects = groupAssignmentsBySubject(teachingAssignments);

  const totalGroups = new Set(
    teachingAssignments
      .map(
        (assignment) =>
          assignment.group_id ?? normalizeRelation(assignment.group)?.id,
      )
      .filter(Boolean),
  ).size;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-slate-950 p-3 text-white">
            <UserRound size={22} />
          </div>

          <div className="min-w-0">
            <h3 className="font-bold leading-6 text-slate-950">
              {teacher.first_name} {teacher.last_name}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {teacher.employee_number
                ? `Empleado ${teacher.employee_number}`
                : "Sin número de empleado"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <div className="rounded-xl bg-slate-100 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <BookOpenCheck size={15} />
              Carga máxima
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {teacher.max_weekly_periods ?? 0} semanales
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {teacher.max_daily_periods ?? 0} diarios
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Clock3 size={15} />
              Turnos
            </p>

            <p className="mt-2 font-bold text-slate-900">
              {teacherShifts.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">Turnos autorizados</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50/70 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <GraduationCap size={15} />
              Materias y grupos
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Clases asignadas en el ciclo escolar activo.
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700">
              {assignedSubjects.length}{" "}
              {assignedSubjects.length === 1 ? "materia" : "materias"}
            </span>

            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
              {totalGroups} {totalGroups === 1 ? "grupo" : "grupos"}
            </span>
          </div>
        </div>

        {assignedSubjects.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center">
            <BookOpenCheck className="mx-auto text-slate-300" size={25} />

            <p className="mt-2 text-sm font-semibold text-slate-700">
              Sin asignaciones docentes
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Este profesor todavía no tiene materias ni grupos asignados.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {assignedSubjects.map((subject) => (
              <article
                key={subject.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                    style={{
                      backgroundColor: subject.color,
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {subject.name}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {subject.groups.map((groupName) => (
                        <span
                          key={groupName}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                        >
                          <DoorOpen size={12} />

                          {groupName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
