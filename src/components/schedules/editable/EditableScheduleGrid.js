"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  useRouter,
} from "next/navigation";
import {
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  Coffee,
  LockKeyhole,
} from "lucide-react";
import DroppableScheduleCell from "@/components/schedules/editable/DroppableScheduleCell";
import DraggableScheduleEntry from "@/components/schedules/editable/DraggableScheduleEntry";
import ScheduleClassCard from "@/components/schedules/ScheduleClassCard";
import { SCHOOL_DAYS } from "@/constants/days";
import {
  moveScheduleEntryAction,
} from "@/app/(dashboard)/horarios/[versionId]/actions";
import {
  closeAlert,
  showErrorAlert,
  showLoadingAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";
import {
  createScheduleEntriesMap,
  createScheduleEntryKey,
} from "@/lib/scheduler/scheduleView";
import { formatTime } from "@/utils/time";

function NonClassSlot({ period }) {
  const isRecess =
    period.period_type === "recess";

  const Icon = isRecess
    ? Coffee
    : LockKeyhole;

  return (
    <div
      className={`flex min-h-24 items-center justify-center gap-2 rounded-xl border px-3 text-center text-xs font-semibold ${
        isRecess
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-300 bg-slate-100 text-slate-500"
      }`}
    >
      <Icon size={15} />

      {isRecess
        ? "Receso"
        : "No disponible"}
    </div>
  );
}

export default function EditableScheduleGrid({
  versionId,
  versionStatus,
  shifts,
  entries,
  view,
}) {
  const router = useRouter();

  const [, startTransition] =
    useTransition();

  const [activeEntry, setActiveEntry] =
    useState(null);

  const editable =
    versionStatus === "draft";

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const entriesMap = useMemo(
    () => createScheduleEntriesMap(entries),
    [entries],
  );

  function handleDragStart(event) {
    setActiveEntry(
      event.active.data.current?.entry ?? null,
    );
  }

  async function handleDragEnd(event) {
    const entry =
      event.active.data.current?.entry;

    const target =
      event.over?.data.current;

    setActiveEntry(null);

    if (!entry || !target) {
      return;
    }

    if (
      entry.day_of_week === target.dayOfWeek &&
      entry.shift_period_id === target.periodId
    ) {
      return;
    }

    showLoadingAlert({
      title: "Moviendo clase",
      text: "Validando profesor, grupo y disponibilidad...",
    });

    const formData = new FormData();

    formData.set("versionId", versionId);
    formData.set("entryId", entry.id);
    formData.set(
      "targetDay",
      String(target.dayOfWeek),
    );
    formData.set(
      "targetPeriodId",
      target.periodId,
    );

    const result =
      await moveScheduleEntryAction(formData);

    closeAlert();

    if (!result.success) {
      await showErrorAlert({
        title: "Movimiento no permitido",
        text: result.message,
      });

      return;
    }

    await showSuccessAlert({
      title: "Clase actualizada",
      text: result.message,
    });

    startTransition(() => {
      router.refresh();
    });
  }

  function handleDragCancel() {
    setActiveEntry(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {!editable && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Esta versión no es un borrador. El horario puede
          consultarse, pero no editarse.
        </div>
      )}

      <div className="space-y-8">
        {shifts.map((shift) => (
          <section
            key={shift.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="font-bold text-slate-950">
                Turno {shift.name}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {formatTime(shift.start_time)} –{" "}
                {formatTime(shift.end_time)}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="sticky left-0 z-20 min-w-52 border-b border-r border-slate-200 bg-slate-50 px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                  {shift.periods.map((period) => {
                    const isClass =
                      period.period_type ===
                      "class";

                    return (
                      <tr key={period.id}>
                        <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-5 py-4 align-top">
                          <p className="font-semibold text-slate-900">
                            {period.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatTime(
                              period.start_time,
                            )}{" "}
                            –{" "}
                            {formatTime(
                              period.end_time,
                            )}
                          </p>
                        </td>

                        {SCHOOL_DAYS.map((day) => {
                          const entry =
                            entriesMap.get(
                              createScheduleEntryKey(
                                day.value,
                                period.id,
                              ),
                            );

                          const droppableId =
                            `${day.value}-${period.id}`;

                          return (
                            <td
                              key={day.value}
                              className="border-b border-r border-slate-200 p-3 align-top last:border-r-0"
                            >
                              {!isClass ? (
                                <NonClassSlot
                                  period={period}
                                />
                              ) : (
                                <DroppableScheduleCell
                                  id={droppableId}
                                  dayOfWeek={day.value}
                                  periodId={period.id}
                                  disabled={!editable}
                                >
                                  {entry ? (
                                   <DraggableScheduleEntry
  versionId={versionId}
  entry={entry}
  view={view}
  editable={editable}
/>
                                  ) : (
                                    <div className="flex min-h-28 items-center justify-center px-3 text-center text-xs font-medium text-slate-400">
                                      {editable
                                        ? "Suelta una clase aquí"
                                        : "Espacio libre"}
                                    </div>
                                  )}
                                </DroppableScheduleCell>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <DragOverlay>
        {activeEntry ? (
          <div className="w-48 rotate-2 opacity-90 shadow-2xl">
            <ScheduleClassCard
              entry={activeEntry}
              view={view}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}