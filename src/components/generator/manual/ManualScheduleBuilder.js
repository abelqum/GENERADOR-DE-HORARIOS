"use client";

import {
  BookOpen,
  CalendarCheck2,
  Check,
  Clock3,
  Eye,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import {
  addManualScheduleEntryAction,
  removeManualScheduleEntryAction,
} from "@/app/(dashboard)/generador/manual/actions";
import { SCHOOL_DAYS } from "@/constants/days";
import { showErrorAlert, showSuccessAlert } from "@/lib/alerts/swal";
import { formatTime } from "@/utils/time";

function createEntryKey(dayOfWeek, periodId) {
  return `${dayOfWeek}-${periodId}`;
}

function createGroupSlotKey(groupId, dayOfWeek, periodId) {
  return `${groupId}-${dayOfWeek}-${periodId}`;
}

function getTeacherName(teacher) {
  return [teacher?.first_name, teacher?.last_name].filter(Boolean).join(" ");
}

function getAvailabilityInfo(type) {
  switch (type) {
    case "unavailable":
      return {
        label: "No disponible",

        className: "border-red-200 bg-red-50 text-red-700",
      };

    case "avoid":
      return {
        label: "Evitar",

        className: "border-amber-200 bg-amber-50 text-amber-700",
      };

    case "preferred":
      return {
        label: "Preferida",

        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };

    case "required":
      return {
        label: "Requerida",

        className: "border-violet-200 bg-violet-50 text-violet-700",
      };

    default:
      return {
        label: "Disponible",

        className: "border-slate-200 bg-white text-slate-500",
      };
  }
}

function NonClassCell({ period }) {
  const isRecess = period.period_type === "recess";

  return (
    <div
      className={`flex min-h-28 items-center justify-center rounded-xl border px-3 text-center text-xs font-bold ${
        isRecess
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-100 text-slate-500"
      }`}
    >
      {isRecess ? "RECESO" : "NO DISPONIBLE"}
    </div>
  );
}

export default function ManualScheduleBuilder({
  version,
  teachers = [],
  selectedTeacher,
  assignments = [],
  shifts = [],
  entries = [],
  fixedEntries = [],
  availability = [],
}) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const [busyCell, setBusyCell] = useState(null);

  const teacherName = getTeacherName(selectedTeacher);

  /*
   * Todas las clases de este profesor.
   */
  const teacherEntries = useMemo(
    () => entries.filter((entry) => entry.teacher_id === selectedTeacher?.id),
    [entries, selectedTeacher],
  );

  const teacherEntriesMap = useMemo(() => {
    const map = new Map();

    for (const entry of teacherEntries) {
      map.set(createEntryKey(entry.day_of_week, entry.shift_period_id), entry);
    }

    return map;
  }, [teacherEntries]);

  /*
   * Número de clases colocadas por
   * teaching_assignment.
   */
  const assignmentUsage = useMemo(() => {
    const map = new Map();

    for (const entry of entries) {
      const assignmentId = entry.teaching_assignment_id;

      map.set(assignmentId, (map.get(assignmentId) ?? 0) + 1);
    }

    return map;
  }, [entries]);

  /*
   * Espacios ya ocupados por los grupos,
   * independientemente del profesor.
   */
  const groupBusyMap = useMemo(() => {
    const map = new Map();

    for (const entry of entries) {
      if (!entry.group_id) {
        continue;
      }

      map.set(
        createGroupSlotKey(
          entry.group_id,
          entry.day_of_week,
          entry.shift_period_id,
        ),
        true,
      );
    }

    return map;
  }, [entries]);

  /*
   * Talleres fijos.
   */
  const fixedEntriesMap = useMemo(() => {
    const map = new Map();

    for (const entry of fixedEntries) {
      map.set(
        createGroupSlotKey(
          entry.group_id,
          entry.day_of_week,
          entry.shift_period_id,
        ),
        true,
      );
    }

    return map;
  }, [fixedEntries]);

  /*
   * Disponibilidad del profesor.
   */
  const availabilityMap = useMemo(() => {
    const map = new Map();

    for (const item of availability) {
      map.set(createEntryKey(item.day_of_week, item.shift_period_id), item);
    }

    return map;
  }, [availability]);

  const requiredPeriods = useMemo(
    () =>
      assignments.reduce(
        (total, assignment) => total + Number(assignment.weekly_periods ?? 0),
        0,
      ),
    [assignments],
  );

  const placedPeriods = teacherEntries.length;

  function handleTeacherChange(event) {
    const teacherId = event.target.value;

    router.push(
      `/generador/manual?version=${version.id}&profesor=${teacherId}`,
    );
  }

  function getCandidateAssignments({ shiftId, dayOfWeek, periodId }) {
    return assignments.filter((assignment) => {
      /*
       * Solamente grupos del turno
       * de la celda.
       */
      if (assignment.group?.shift_id !== shiftId) {
        return false;
      }

      /*
       * Ya completó sus horas.
       */
      const used = assignmentUsage.get(assignment.id) ?? 0;

      if (used >= Number(assignment.weekly_periods)) {
        return false;
      }

      /*
       * El grupo ya tiene clase.
       */
      if (
        groupBusyMap.has(
          createGroupSlotKey(assignment.group_id, dayOfWeek, periodId),
        )
      ) {
        return false;
      }

      /*
       * El grupo tiene Taller.
       */
      if (
        fixedEntriesMap.has(
          createGroupSlotKey(assignment.group_id, dayOfWeek, periodId),
        )
      ) {
        return false;
      }

      return true;
    });
  }

  async function handleAdd({ shift, day, period }) {
    if (isPending) {
      return;
    }

    const availabilityItem = availabilityMap.get(
      createEntryKey(day.value, period.id),
    );

    if (availabilityItem?.availability_type === "unavailable") {
      await showErrorAlert({
        title: "Profesor no disponible",

        text: "Esta hora está marcada como No disponible.",
      });

      return;
    }

    const candidates = getCandidateAssignments({
      shiftId: shift.id,

      dayOfWeek: day.value,

      periodId: period.id,
    });

    if (candidates.length === 0) {
      await showErrorAlert({
        title: "No hay grupos disponibles",

        text: "En esta hora no queda ninguna asignación disponible para este profesor. El grupo puede estar ocupado, tener Taller o haber completado ya sus horas semanales.",
      });

      return;
    }

    const inputOptions = {};

    for (const assignment of candidates) {
      const used = assignmentUsage.get(assignment.id) ?? 0;

      inputOptions[assignment.id] =
        `${assignment.group?.name || "Sin grupo"} · ` +
        `${assignment.subject?.name || "Sin materia"} · ` +
        `${used}/${assignment.weekly_periods}`;
    }

    const { value: assignmentId } = await Swal.fire({
      icon: "question",

      title: "Agregar clase",

      html: `
        <div style="text-align:left">
          <p style="margin-bottom:8px">
            <strong>${day.name}</strong>
          </p>

          <p style="margin-bottom:4px">
            ${period.name}
          </p>

          <p style="color:#64748b;font-size:13px">
            ${formatTime(period.start_time)}
            –
            ${formatTime(period.end_time)}
          </p>
        </div>
      `,

      input: "select",

      inputOptions,

      inputPlaceholder: "Selecciona grupo y materia",

      showCancelButton: true,

      confirmButtonText: "Agregar clase",

      cancelButtonText: "Cancelar",

      inputValidator: (value) => {
        if (!value) {
          return "Selecciona una asignación.";
        }

        return null;
      },
    });

    if (!assignmentId) {
      return;
    }

    const cellKey = createEntryKey(day.value, period.id);

    setBusyCell(cellKey);

    startTransition(async () => {
      const formData = new FormData();

      formData.set("versionId", version.id);

      formData.set("assignmentId", assignmentId);

      formData.set("dayOfWeek", String(day.value));

      formData.set("shiftPeriodId", period.id);

      const result = await addManualScheduleEntryAction(formData);

      setBusyCell(null);

      if (!result?.success) {
        await showErrorAlert({
          title: "No se pudo agregar",

          text: result?.message || "No fue posible colocar la clase.",
        });

        return;
      }

      await showSuccessAlert({
        title: "Clase agregada",

        text: result.message,
      });

      router.refresh();
    });
  }

  async function handleRemove(entry) {
    if (isPending) {
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",

      title: "¿Quitar esta clase?",

      text: `${entry.subject?.name || "Materia"} · ${entry.group?.name || "Grupo"}`,

      showCancelButton: true,

      confirmButtonText: "Sí, quitar",

      cancelButtonText: "Cancelar",

      confirmButtonColor: "#dc2626",
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    startTransition(async () => {
      const formData = new FormData();

      formData.set("versionId", version.id);

      formData.set("entryId", entry.id);

      const result = await removeManualScheduleEntryAction(formData);

      if (!result?.success) {
        await showErrorAlert({
          title: "No se pudo quitar",

          text: result?.message || "No fue posible quitar la clase.",
        });

        return;
      }

      router.refresh();
    });
  }

  if (!selectedTeacher) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        No existen profesores con asignaciones para este ciclo escolar.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Constructor manual
            </p>

            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {version.name}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Selecciona un profesor y coloca sus clases directamente sobre el
              horario.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/horarios/${version.id}?vista=teacher&profesor=${selectedTeacher.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Eye size={17} />
              Ver horario
            </Link>

            <Link
              href="/generador/manual"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={17} />
              Nuevo lienzo
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-sm font-semibold text-slate-700">
            Profesor
          </label>

          <div className="mt-2 flex items-center gap-3">
            <UserRound size={19} className="text-slate-500" />

            <select
              value={selectedTeacher.id}
              onChange={handleTeacherChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-500"
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {getTeacherName(teacher)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Carga del profesor
          </p>

          <p className="mt-2 text-xl font-bold">
            {placedPeriods} / {requiredPeriods}
          </p>

          <p className="mt-1 text-sm text-slate-300">horas colocadas</p>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{
                width: `${
                  requiredPeriods > 0
                    ? Math.min(100, (placedPeriods / requiredPeriods) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CalendarCheck2 size={20} className="mt-0.5 text-slate-600" />

          <div>
            <h3 className="font-bold text-slate-950">{teacherName}</h3>

            <p className="mt-1 text-sm text-slate-500">
              Los colores de las celdas corresponden a la disponibilidad que
              configuraste previamente.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
            Disponible
          </span>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
            Preferida
          </span>

          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700">
            Evitar
          </span>

          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-700">
            Requerida
          </span>

          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-red-700">
            No disponible
          </span>
        </div>
      </section>

      <div className="space-y-8">
        {shifts.map((shift) => (
          <section
            key={shift.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="font-bold text-slate-950">Turno {shift.name}</h3>

              <p className="mt-1 text-sm text-slate-500">
                {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="min-w-52 border-b border-r border-slate-200 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Periodo
                    </th>

                    {SCHOOL_DAYS.map((day) => (
                      <th
                        key={day.value}
                        className="min-w-48 border-b border-r border-slate-200 px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 last:border-r-0"
                      >
                        {day.name}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {shift.periods.map((period) => (
                    <tr key={period.id}>
                      <td className="border-b border-r border-slate-200 bg-white px-5 py-4 align-top">
                        <p className="font-semibold text-slate-900">
                          {period.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatTime(period.start_time)} –{" "}
                          {formatTime(period.end_time)}
                        </p>
                      </td>

                      {SCHOOL_DAYS.map((day) => {
                        const key = createEntryKey(day.value, period.id);

                        const entry = teacherEntriesMap.get(key);

                        if (period.period_type !== "class") {
                          return (
                            <td
                              key={day.value}
                              className="border-b border-r border-slate-200 p-3 last:border-r-0"
                            >
                              <NonClassCell period={period} />
                            </td>
                          );
                        }

                        if (entry) {
                          return (
                            <td
                              key={day.value}
                              className="border-b border-r border-slate-200 p-3 align-top last:border-r-0"
                            >
                              <article className="relative min-h-28 rounded-xl border border-slate-300 bg-slate-950 p-3 text-white shadow-sm">
                                <p className="pr-8 text-sm font-bold">
                                  {entry.subject?.name || "Materia"}
                                </p>

                                <p className="mt-2 text-xl font-extrabold">
                                  {entry.group?.name || "Grupo"}
                                </p>

                                <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-300">
                                  <Check size={12} />
                                  Clase colocada
                                </div>

                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleRemove(entry)}
                                  title="Quitar clase"
                                  className="absolute right-2 top-2 rounded-lg bg-white/10 p-2 text-white transition hover:bg-red-600 disabled:opacity-40"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </article>
                            </td>
                          );
                        }

                        const availabilityItem = availabilityMap.get(key);

                        const availabilityType =
                          availabilityItem?.availability_type || "available";

                        const availabilityInfo =
                          getAvailabilityInfo(availabilityType);

                        const candidates = getCandidateAssignments({
                          shiftId: shift.id,

                          dayOfWeek: day.value,

                          periodId: period.id,
                        });

                        const isUnavailable =
                          availabilityType === "unavailable";

                        const noCandidates = candidates.length === 0;

                        const isBusy = busyCell === key;

                        return (
                          <td
                            key={day.value}
                            className="border-b border-r border-slate-200 p-3 align-top last:border-r-0"
                          >
                            <button
                              type="button"
                              disabled={
                                isPending || isUnavailable || noCandidates
                              }
                              onClick={() =>
                                handleAdd({
                                  shift,
                                  day,
                                  period,
                                })
                              }
                              className={`flex min-h-28 w-full flex-col items-center justify-center rounded-xl border p-3 text-center transition ${availabilityInfo.className} ${
                                !isUnavailable && !noCandidates
                                  ? "hover:-translate-y-0.5 hover:border-slate-500 hover:shadow-md"
                                  : "cursor-not-allowed opacity-75"
                              }`}
                            >
                              <span className="text-[10px] font-bold uppercase tracking-wide">
                                {availabilityInfo.label}
                              </span>

                              {!isUnavailable && !noCandidates && (
                                <>
                                  <Plus size={20} className="mt-3" />

                                  <span className="mt-1 text-xs font-bold">
                                    {isBusy ? "Guardando..." : "Agregar clase"}
                                  </span>

                                  <span className="mt-1 text-[10px] opacity-70">
                                    {candidates.length} grupo(s) disponibles
                                  </span>
                                </>
                              )}

                              {!isUnavailable && noCandidates && (
                                <span className="mt-2 text-[11px] font-semibold">
                                  Sin grupos disponibles
                                </span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-slate-600" />

          <div>
            <h3 className="font-bold text-slate-950">
              Asignaciones de {teacherName}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Aquí puedes comprobar cuántas horas faltan por colocar para cada
              grupo.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => {
            const used = assignmentUsage.get(assignment.id) ?? 0;

            const total = Number(assignment.weekly_periods);

            const completed = used >= total;

            return (
              <article
                key={assignment.id}
                className={`rounded-xl border p-4 ${
                  completed
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950">
                      {assignment.subject?.name || "Materia"}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      Grupo {assignment.group?.name || "—"}
                    </p>
                  </div>

                  {completed && (
                    <Check size={18} className="text-emerald-600" />
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm">
                  <Clock3 size={15} className="text-slate-400" />

                  <span
                    className={
                      completed
                        ? "font-bold text-emerald-700"
                        : "font-semibold text-slate-600"
                    }
                  >
                    {used} / {total} horas
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
