"use client";

import {
  Coffee,
  GripVertical,
  Lock,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import Swal from "sweetalert2";

import { moveScheduleEntryAction } from "@/app/(dashboard)/horarios/[versionId]/actions";
import { SCHOOL_DAYS } from "@/constants/days";
import { formatTime } from "@/utils/time";

function createEntryKey(groupId, dayOfWeek, shiftPeriodId) {
  return `${groupId}-${dayOfWeek}-${shiftPeriodId}`;
}

function getTeacherName(teacher) {
  if (!teacher) {
    return "Sin profesor";
  }

  const name = [teacher.first_name, teacher.last_name]
    .filter(Boolean)
    .join(" ");

  return name || "Sin profesor";
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

function getCellMinimumWidth(groupCount) {
  if (groupCount <= 3) {
    return 420;
  }

  if (groupCount <= 6) {
    return 680;
  }

  if (groupCount <= 12) {
    return 840;
  }

  return 980;
}

function getGridColumnCount(groupCount) {
  if (groupCount <= 1) {
    return 1;
  }

  if (groupCount <= 3) {
    return groupCount;
  }

  return Math.min(6, groupCount);
}

function getDragPayload(event) {
  try {
    const rawPayload = event.dataTransfer.getData("application/json");

    if (!rawPayload) {
      return null;
    }

    return JSON.parse(rawPayload);
  } catch {
    return null;
  }
}

function NonClassSlot({ period }) {
  const isRecess = period.period_type === "recess";

  const Icon = isRecess ? Coffee : LockKeyhole;

  return (
    <div
      className={`flex min-h-[96px] items-center justify-center gap-2 rounded-xl border px-3 text-center text-xs font-semibold ${
        isRecess
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-300 bg-slate-100 text-slate-500"
      }`}
    >
      <Icon size={15} />

      {isRecess ? "Receso" : "No disponible"}
    </div>
  );
}

function EmptyGroupSlot({
  group,
  day,
  period,
  canEdit,
  draggedEntry,
  activeDropKey,
  onDragEnter,
  onDragLeave,
  onDrop,
}) {
  const dropKey = createEntryKey(group.id, day.value, period.id);

  const belongsToDraggedGroup = draggedEntry?.group_id === group.id;

  const isActive = activeDropKey === dropKey;

  const canReceive = canEdit && Boolean(draggedEntry) && belongsToDraggedGroup;

  function handleDragOver(event) {
    if (!canReceive) {
      return;
    }

    event.preventDefault();

    event.dataTransfer.dropEffect = "move";
  }

  return (
    <article
      onDragEnter={(event) => {
        if (!canReceive) {
          return;
        }

        event.preventDefault();

        onDragEnter(dropKey);
      }}
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) {
          return;
        }

        onDragLeave(dropKey);
      }}
      onDrop={(event) => {
        if (!canReceive) {
          return;
        }

        event.preventDefault();

        onDrop({
          event,
          group,
          day,
          period,
        });
      }}
      className={`min-h-[96px] rounded-lg border border-dashed p-2 transition ${
        isActive
          ? "scale-[1.02] border-blue-500 bg-blue-50 shadow-md"
          : canReceive
            ? "border-blue-300 bg-blue-50/40"
            : "border-slate-300 bg-slate-50"
      }`}
    >
      <p className="truncate text-[11px] font-bold text-slate-700">
        {group.name}
      </p>

      <p
        className={`mt-3 text-[10px] font-medium ${
          canReceive ? "text-blue-600" : "text-slate-400"
        }`}
      >
        {canReceive ? "Suelta aquí" : "Libre"}
      </p>
    </article>
  );
}

function GeneralClassCard({
  entry,
  group,
  canEdit,
  isDragging,
  onDragStart,
  onDragEnd,
}) {
  const subjectName = entry.subject?.name || "Materia sin nombre";

  const teacherName = getTeacherName(entry.teacher);

  const subjectColor = entry.subject?.color || "#64748B";

  const draggable = canEdit && !entry.locked;

  return (
    <article
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) {
          event.preventDefault();
          return;
        }

        const payload = {
          entryId: entry.id,
          groupId: group.id,
          group_id: group.id,
          dayOfWeek: entry.day_of_week,
          shiftPeriodId: entry.shift_period_id,
        };

        event.dataTransfer.effectAllowed = "move";

        event.dataTransfer.setData("application/json", JSON.stringify(payload));

        event.dataTransfer.setData("text/plain", entry.id);

        onDragStart({
          ...entry,
          group_id: group.id,
        });
      }}
      onDragEnd={onDragEnd}
      className={`relative min-h-[96px] rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition ${
        draggable
          ? "cursor-grab hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md active:cursor-grabbing"
          : "cursor-default"
      } ${isDragging ? "scale-95 opacity-40" : ""}`}
      style={{
        borderTopColor: subjectColor,
        borderTopWidth: "4px",
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="truncate text-[11px] font-extrabold text-slate-950">
          {group.name}
        </p>

        <div className="flex shrink-0 items-center gap-1 text-slate-400">
          {entry.locked ? (
            <Lock
              size={12}
              className="text-slate-600"
              aria-label="Clase bloqueada"
            />
          ) : draggable ? (
            <GripVertical size={13} aria-label="Arrastrar clase" />
          ) : null}
        </div>
      </div>

      <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-700">
        {subjectName}
      </p>

      <p className="mt-2 flex items-start gap-1 text-[9px] font-medium leading-4 text-slate-500">
        <UserRound size={11} className="mt-0.5 shrink-0" />

        <span className="line-clamp-2">{teacherName}</span>
      </p>
    </article>
  );
}

export default function GeneralScheduleGrid({
  versionId,
  versionStatus,
  shifts = [],
  groups = [],
  entries = [],
}) {
  const router = useRouter();

  const [isRefreshing, startTransition] = useTransition();

  const [draggedEntry, setDraggedEntry] = useState(null);

  const [activeDropKey, setActiveDropKey] = useState(null);

  const [isMoving, setIsMoving] = useState(false);

  const canEdit = versionStatus === "draft" && !isMoving && !isRefreshing;

  const entriesMap = useMemo(() => {
    const map = new Map();

    for (const entry of entries) {
      if (!entry.group_id) {
        continue;
      }

      map.set(
        createEntryKey(
          entry.group_id,
          entry.day_of_week,
          entry.shift_period_id,
        ),
        entry,
      );
    }

    return map;
  }, [entries]);

  function clearDragState() {
    setDraggedEntry(null);
    setActiveDropKey(null);
  }

  async function handleDrop({ event, group, day, period }) {
    const payload = getDragPayload(event);

    const sourceEntry =
      draggedEntry ||
      (payload
        ? {
            id: payload.entryId,
            group_id: payload.groupId ?? payload.group_id,
            day_of_week: payload.dayOfWeek,
            shift_period_id: payload.shiftPeriodId,
          }
        : null);

    clearDragState();

    if (!canEdit || !sourceEntry) {
      return;
    }

    if (sourceEntry.group_id !== group.id) {
      await Swal.fire({
        icon: "warning",
        title: "Movimiento no permitido",
        text: "En la vista general solamente puedes mover una clase hacia otro espacio del mismo grupo.",
        confirmButtonText: "Entendido",
      });

      return;
    }

    if (
      Number(sourceEntry.day_of_week) === Number(day.value) &&
      sourceEntry.shift_period_id === period.id
    ) {
      return;
    }

    setIsMoving(true);

    Swal.fire({
      title: "Moviendo clase",
      text: "Validando la nueva posición...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const formData = new FormData();

      formData.set("versionId", versionId);

      formData.set("entryId", sourceEntry.id);

      formData.set("targetDay", String(day.value));

      formData.set("targetPeriodId", period.id);

      const result = await moveScheduleEntryAction(formData);

      await Swal.close();

      if (!result?.success) {
        await Swal.fire({
          icon: "error",
          title: "Movimiento no permitido",
          text: result?.message || "No fue posible guardar la nueva posición.",
          confirmButtonText: "Aceptar",
        });

        return;
      }

      await Swal.fire({
        icon: "success",
        title: "Clase movida",
        text: result.message || "La nueva posición se guardó correctamente.",
        timer: 1500,
        showConfirmButton: false,
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Error moviendo clase desde la vista general:", error);

      await Swal.close();

      await Swal.fire({
        icon: "error",
        title: "No se pudo mover",
        text: "Ocurrió un error inesperado al guardar la nueva posición.",
        confirmButtonText: "Aceptar",
      });
    } finally {
      setIsMoving(false);
    }
  }

  if (!shifts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h3 className="font-bold text-slate-900">
          No existen horas configuradas
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Configura turnos y horas para visualizar el horario general.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {shifts.map((shift) => {
        const shiftGroups = [
          ...groups.filter(
            (group) =>
              group.shift?.id === shift.id || group.shift_id === shift.id,
          ),
        ].sort(sortGroups);

        const gridColumnCount = getGridColumnCount(shiftGroups.length);

        const cellMinimumWidth = getCellMinimumWidth(shiftGroups.length);

        return (
          <section
            key={shift.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-950">
                    Vista general · Turno {shift.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatTime(shift.start_time)} –{" "}
                    {formatTime(shift.end_time)}
                  </p>
                </div>

                <p className="text-sm font-semibold text-slate-600">
                  {shiftGroups.length}{" "}
                  {shiftGroups.length === 1 ? "grupo" : "grupos"}
                </p>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Cada tarjeta muestra grupo, materia y profesor.
                {versionStatus === "draft"
                  ? " Puedes arrastrar una clase hacia un espacio libre del mismo grupo."
                  : " Esta versión es únicamente de consulta."}
              </p>
            </div>

            {shiftGroups.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No existen grupos asociados a este turno.
              </div>
            ) : (
              <div className="overflow-x-auto pb-6">
                <table className="border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="sticky left-0 z-30 min-w-48 border-b border-r border-slate-200 bg-slate-50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Hora
                      </th>

                      {SCHOOL_DAYS.map((day) => (
                        <th
                          key={day.value}
                          className="border-b border-r border-slate-200 px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 last:border-r-0"
                          style={{
                            minWidth: cellMinimumWidth,
                          }}
                        >
                          {day.name}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {shift.periods.map((period) => {
                      const isClass = period.period_type === "class";

                      return (
                        <tr key={period.id}>
                          <td className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-5 py-4 align-top">
                            <p className="font-semibold text-slate-900">
                              {period.name}
                            </p>

                            <p className="mt-1 whitespace-nowrap text-xs text-slate-500">
                              {formatTime(period.start_time)} –{" "}
                              {formatTime(period.end_time)}
                            </p>
                          </td>

                          {SCHOOL_DAYS.map((day) => (
                            <td
                              key={day.value}
                              className="border-b border-r border-slate-200 p-3 align-top last:border-r-0"
                              style={{
                                minWidth: cellMinimumWidth,
                              }}
                            >
                              {!isClass ? (
                                <NonClassSlot period={period} />
                              ) : (
                                <div
                                  className="grid gap-2"
                                  style={{
                                    gridTemplateColumns: `repeat(${gridColumnCount}, minmax(112px, 1fr))`,
                                  }}
                                >
                                  {shiftGroups.map((group) => {
                                    const entry = entriesMap.get(
                                      createEntryKey(
                                        group.id,
                                        day.value,
                                        period.id,
                                      ),
                                    );

                                    return entry ? (
                                      <GeneralClassCard
                                        key={group.id}
                                        entry={entry}
                                        group={group}
                                        canEdit={canEdit}
                                        isDragging={
                                          draggedEntry?.id === entry.id
                                        }
                                        onDragStart={setDraggedEntry}
                                        onDragEnd={clearDragState}
                                      />
                                    ) : (
                                      <EmptyGroupSlot
                                        key={group.id}
                                        group={group}
                                        day={day}
                                        period={period}
                                        canEdit={canEdit}
                                        draggedEntry={draggedEntry}
                                        activeDropKey={activeDropKey}
                                        onDragEnter={setActiveDropKey}
                                        onDragLeave={(dropKey) => {
                                          setActiveDropKey((currentKey) =>
                                            currentKey === dropKey
                                              ? null
                                              : currentKey,
                                          );
                                        }}
                                        onDrop={handleDrop}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
