"use client";

import Link from "next/link";
import {
  BookOpenCheck,
  Clock3,
  FilterX,
  Power,
  PowerOff,
  Search,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  deleteTeacherAction,
  toggleTeacherAction,
} from "@/app/(dashboard)/profesores/actions";
import TeacherEditButton from "@/components/teachers/TeacherEditButton";

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Normaliza las diferentes formas en las que
 * pueden llegar las materias de un profesor.
 */
function getTeacherSubjects(teacher) {
  if (Array.isArray(teacher.subjects)) {
    return teacher.subjects
      .map((item) => {
        if (!item) {
          return null;
        }

        if (item.subject) {
          return item.subject;
        }

        return item;
      })
      .filter(Boolean);
  }

  if (Array.isArray(teacher.teacher_subjects)) {
    return teacher.teacher_subjects
      .map((relation) => relation?.subject ?? null)
      .filter(Boolean);
  }

  if (Array.isArray(teacher.teacherSubjects)) {
    return teacher.teacherSubjects
      .map((relation) => relation?.subject ?? relation ?? null)
      .filter(Boolean);
  }

  return [];
}

function getTeacherFullName(teacher) {
  return [teacher.first_name, teacher.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export default function TeachersTable({ teachers = [] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const availableSubjects = useMemo(() => {
    const subjectsMap = new Map();

    teachers.forEach((teacher) => {
      getTeacherSubjects(teacher).forEach((subject) => {
        if (!subject?.id) {
          return;
        }

        subjectsMap.set(subject.id, subject);
      });
    });

    return Array.from(subjectsMap.values()).sort((first, second) =>
      String(first.name ?? "").localeCompare(String(second.name ?? ""), "es", {
        sensitivity: "base",
      }),
    );
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    return teachers.filter((teacher) => {
      const fullName = normalizeText(getTeacherFullName(teacher));

      const employeeNumber = normalizeText(teacher.employee_number);

      const email = normalizeText(teacher.email);

      const matchesSearch =
        !normalizedSearch ||
        fullName.includes(normalizedSearch) ||
        employeeNumber.includes(normalizedSearch) ||
        email.includes(normalizedSearch);

      const teacherSubjects = getTeacherSubjects(teacher);

      const matchesSubject =
        !selectedSubjectId ||
        teacherSubjects.some(
          (subject) => String(subject.id) === String(selectedSubjectId),
        );

      return matchesSearch && matchesSubject;
    });
  }, [teachers, searchTerm, selectedSubjectId]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) || Boolean(selectedSubjectId);

  function clearFilters() {
    setSearchTerm("");
    setSelectedSubjectId("");
  }

  if (!teachers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Users className="mx-auto text-slate-400" size={34} />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay profesores registrados
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Registra al personal docente de la escuela.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-slate-900">Profesores registrados</h3>

          <p className="text-sm text-slate-500">
            Edita sus datos y configura sus materias, turnos y disponibilidad.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_minmax(220px,320px)_auto]">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre, empleado o correo..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <select
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Todas las materias</option>

            {availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <FilterX size={17} />
              Limpiar
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">
            Mostrando{" "}
            <span className="font-bold text-slate-700">
              {filteredTeachers.length}
            </span>{" "}
            de{" "}
            <span className="font-bold text-slate-700">{teachers.length}</span>{" "}
            profesores
          </p>

          {selectedSubjectId && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Materia:{" "}
              {availableSubjects.find(
                (subject) => String(subject.id) === String(selectedSubjectId),
              )?.name || "Seleccionada"}
            </span>
          )}
        </div>
      </div>

      {filteredTeachers.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <Search className="mx-auto text-slate-300" size={38} />

          <h4 className="mt-4 font-bold text-slate-900">
            No se encontraron profesores
          </h4>

          <p className="mt-2 text-sm text-slate-500">
            Cambia el nombre buscado o selecciona otra materia.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Mostrar todos
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4">Profesor</th>

                <th className="px-6 py-4">Empleado</th>

                <th className="px-6 py-4">Contacto</th>

                <th className="px-6 py-4">Carga máxima</th>

                <th className="px-6 py-4">Materias</th>

                <th className="px-6 py-4">Turnos</th>

                <th className="px-6 py-4">Estado</th>

                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredTeachers.map((teacher) => {
                const teacherSubjects = getTeacherSubjects(teacher);

                const subjectsCount =
                  teacher.subjectsCount ?? teacherSubjects.length;

                const shiftsCount = teacher.shiftsCount ?? 0;

                const assignmentsCount = teacher.assignmentsCount ?? 0;

                const availabilityCount = teacher.availabilityCount ?? 0;

                const entriesCount = teacher.entriesCount ?? 0;

                const canDelete =
                  assignmentsCount === 0 &&
                  availabilityCount === 0 &&
                  entriesCount === 0;

                const subjectNames = teacherSubjects
                  .map((subject) => subject.name)
                  .filter(Boolean)
                  .join(", ");

                return (
                  <tr
                    key={teacher.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-950">
                        {getTeacherFullName(teacher)}
                      </p>

                      {teacher.notes && (
                        <p
                          title={teacher.notes}
                          className="mt-1 max-w-xs truncate text-xs text-slate-500"
                        >
                          {teacher.notes}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {teacher.employee_number || "Sin número"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      <p>{teacher.email || "Sin correo"}</p>

                      <p className="mt-1 text-xs text-slate-500">
                        {teacher.phone || "Sin teléfono"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-700">
                        {teacher.max_weekly_periods ?? 0} semanales
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {teacher.max_daily_periods ?? 0} diarios
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        title={subjectNames || "Sin materias"}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                      >
                        <BookOpenCheck size={14} />

                        {subjectsCount}
                      </span>

                      {subjectNames && (
                        <p
                          title={subjectNames}
                          className="mt-2 max-w-[180px] truncate text-xs text-slate-500"
                        >
                          {subjectNames}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                        <Clock3 size={14} />

                        {shiftsCount}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          teacher.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {teacher.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <TeacherEditButton teacher={teacher} />

                        <Link
                          href={`/profesores/${teacher.id}/configuracion`}
                          title="Configurar materias y turnos"
                          className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
                        >
                          <Settings2 size={16} />
                        </Link>

                        <form action={toggleTeacherAction}>
                          <input
                            type="hidden"
                            name="teacherId"
                            value={teacher.id}
                          />

                          <input
                            type="hidden"
                            name="nextActive"
                            value={String(!teacher.active)}
                          />

                          <button
                            type="submit"
                            title={
                              teacher.active
                                ? "Desactivar profesor"
                                : "Activar profesor"
                            }
                            className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
                          >
                            {teacher.active ? (
                              <PowerOff size={16} />
                            ) : (
                              <Power size={16} />
                            )}
                          </button>
                        </form>

                        {canDelete && (
                          <form action={deleteTeacherAction}>
                            <input
                              type="hidden"
                              name="teacherId"
                              value={teacher.id}
                            />

                            <button
                              type="submit"
                              title="Eliminar profesor"
                              className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </form>
                        )}
                      </div>

                      {!canDelete && (
                        <p className="mt-2 text-right text-[11px] text-slate-400">
                          No puede eliminarse mientras tenga datos relacionados.
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
