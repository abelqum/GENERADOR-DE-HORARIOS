"use client";

import { useDroppable } from "@dnd-kit/core";

export default function DroppableScheduleCell({
  id,
  dayOfWeek,
  periodId,
  disabled = false,
  children,
}) {
  const {
    isOver,
    setNodeRef,
  } = useDroppable({
    id,
    disabled,
    data: {
      dayOfWeek,
      periodId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-32 rounded-xl border p-2 transition ${
        disabled
          ? "border-slate-200 bg-slate-100"
          : isOver
            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
            : "border-dashed border-slate-300 bg-slate-50"
      }`}
    >
      {children}
    </div>
  );
}