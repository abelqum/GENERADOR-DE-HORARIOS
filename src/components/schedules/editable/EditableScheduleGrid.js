"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  BriefcaseBusiness,
  Coffee,
  Lock,
  LockKeyhole,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { moveScheduleEntryAction } from "@/app/(dashboard)/horarios/[versionId]/actions";
import DraggableScheduleEntry from "@/components/schedules/editable/DraggableScheduleEntry";
import DroppableScheduleCell from "@/components/schedules/editable/DroppableScheduleCell";
import TeacherFreeSlotLabelControl from "@/components/schedules/editable/TeacherFreeSlotLabelControl";
import ScheduleClassCard from "@/components/schedules/ScheduleClassCard";
import { SCHOOL_DAYS } from "@/constants/days";
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
  const isRecess = period.period_type === "recess";

  const Icon = isRecess ? Coffee : LockKeyhole;

  return (
    <div
      className={`flex min-h-24 items-center justify-center gap-2 rounded-xl border px-3 text-center text-xs font-semibold ${
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

function WorkshopScheduleCell({ fixedEntry }) {
  const color = fixedEntry.color || "#f59e0b";

  return (
    <article
      title="Taller fijo. Este espacio no puede ocuparse con una clase."
      className="min-h-32 rounded-xl border border-amber-300 bg-amber-50 p-3 shadow-sm"
      style={{
        borderTopColor: color,
        borderTopWidth: "5px",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
            <Wrench size={16} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-amber-800">
              Taller
            </p>

            <p className="mt-1 text-[11px] font-medium text-amber-700">
              Actividad fija
            </p>
          </div>
        </div>

        <Lock
          size={15}
          className="shrink-0 text-amber-700"
          aria-label="Taller bloqueado"
        />
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-white/70 px-3 py-2">
        <p className="text-[11px] font-semibold text-amber-800">
          Este espacio está reservado.
        </p>

        <p className="mt-1 text-[10px] leading-4 text-amber-700">
          No es una hora libre y no se puede mover una clase aquí.
        </p>
      </div>
    </article>
  );
}

export default function EditableScheduleGrid({
  versionId,
  versionStatus,
  shifts = [],
  entries = [],
  fixedEntries = [],
  view,
  teacherId = null,
  teacherSlotLabels = [],
}) {
  const router = useRouter();

  const [, startTransition] = useTransition();

  const [activeEntry, setActiveEntry] = useState(null);

  /*
   * ID estable para dnd-kit.
   *
   * Evita que el servidor genere:
   * DndDescribedBy-0
   *
   * y el navegador:
   * DndDescribedBy-1
   *
   * No requiere useEffect ni setIsMounted.
   */
  const dndContextId = [
    "schedule-grid",
    versionId,
    view,
    teacherId || "no-teacher",
  ].join("-");

  const editable = versionStatus === "draft";

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

  /*
   * Los talleres solamente aparecen
   * en el horario del grupo.
   */
  const fixedEntriesMap = useMemo(() => {
    const map = new Map();

    if (view !== "group") {
      return map;
    }

    for (const fixedEntry of fixedEntries) {
      map.set(
        createScheduleEntryKey(
          fixedEntry.day_of_week,
          fixedEntry.shift_period_id,
        ),
        fixedEntry,
      );
    }

    return map;
  }, [fixedEntries, view]);

  /*
   * Horas administrativas del profesor.
   *
   * Ausencia del registro:
   * Libre.
   *
   * label = service:
   * Servicio.
   */
  const teacherSlotLabelsMap = useMemo(() => {
    const map = new Map();

    if (view !== "teacher") {
      return map;
    }

    for (const slotLabel of teacherSlotLabels) {
      const dayOfWeek = Number(slotLabel?.day_of_week);

      if (!slotLabel?.shift_period_id || !Number.isInteger(dayOfWeek)) {
        continue;
      }

      map.set(
        createScheduleEntryKey(dayOfWeek, slotLabel.shift_period_id),
        slotLabel,
      );
    }

    return map;
  }, [teacherSlotLabels, view]);

  function handleDragStart(event) {
    setActiveEntry(event.active.data.current?.entry ?? null);
  }

  async function handleDragEnd(event) {
    const entry = event.active.data.current?.entry;

    const target = event.over?.data.current;

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

    const targetFixedEntry = fixedEntriesMap.get(
      createScheduleEntryKey(target.dayOfWeek, target.periodId),
    );

    if (targetFixedEntry) {
      await showErrorAlert({
        title: "Movimiento no permitido",

        text: "Ese espacio corresponde a Taller y no puede ocuparse con una clase.",
      });

      return;
    }

    showLoadingAlert({
      title: "Moviendo clase",

      text: "Validando profesor, grupo y disponibilidad...",
    });

    const formData = new FormData();

    formData.set("versionId", versionId);

    formData.set("entryId", entry.id);

    formData.set("targetDay", String(target.dayOfWeek));

    formData.set("targetPeriodId", target.periodId);

    const result = await moveScheduleEntryAction(formData);

    closeAlert();

    if (!result?.success) {
      await showErrorAlert({
        title: "Movimiento no permitido",

        text: result?.message || "No fue posible mover la clase.",
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

  if (!shifts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h3 className="font-bold text-slate-900">
          No existen horas configuradas
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Configura turnos y horas para visualizar este horario.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      id={dndContextId}
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {!editable && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Esta versión no es un borrador. El horario puede consultarse, pero no
          editarse.
        </div>
      )}

      {view === "group" && fixedEntries.length > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <Wrench size={18} className="shrink-0" />

          <p>
            Las celdas marcadas como <strong>Taller</strong> son actividades
            fijas. No son horas libres y no aceptan clases.
          </p>
        </div>
      )}

      {view === "teacher" && teacherId && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
          <BriefcaseBusiness size={18} className="shrink-0" />

          <p>
            En las horas sin clase puedes elegir entre <strong>Libre</strong> y{" "}
            <strong>Servicio</strong>. Esta selección no modifica el horario ni
            afecta al solver.
          </p>
        </div>
      )}

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
                    const isClass = period.period_type === "class";

                    return (
                      <tr key={period.id}>
                        <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-5 py-4 align-top">
                          <p className="font-semibold text-slate-900">
                            {period.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatTime(period.start_time)} –{" "}
                            {formatTime(period.end_time)}
                          </p>
                        </td>

                        {SCHOOL_DAYS.map((day) => {
                          const entryKey = createScheduleEntryKey(
                            day.value,
                            period.id,
                          );

                          const entry = entriesMap.get(entryKey);

                          const fixedEntry = fixedEntriesMap.get(entryKey);

                          const teacherSlotLabel =
                            teacherSlotLabelsMap.get(entryKey);

                          const droppableId = `${day.value}-${period.id}`;

                          return (
                            <td
                              key={day.value}
                              className="border-b border-r border-slate-200 p-3 align-top last:border-r-0"
                            >
                              {!isClass ? (
                                <NonClassSlot period={period} />
                              ) : fixedEntry ? (
                                <WorkshopScheduleCell fixedEntry={fixedEntry} />
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
                                  ) : view === "teacher" && teacherId ? (
                                    <TeacherFreeSlotLabelControl
                                      key={`${teacherId}-${entryKey}`}
                                      versionId={versionId}
                                      teacherId={teacherId}
                                      dayOfWeek={day.value}
                                      shiftPeriodId={period.id}
                                      initialLabel={
                                        teacherSlotLabel?.label === "service"
                                          ? "service"
                                          : "free"
                                      }
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
            <ScheduleClassCard entry={activeEntry} view={view} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
