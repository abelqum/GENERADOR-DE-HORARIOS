"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import ScheduleClassCard from "@/components/schedules/ScheduleClassCard";
import ScheduleEntryLockButton from "@/components/schedules/editable/ScheduleEntryLockButton";

export default function DraggableScheduleEntry({
  versionId,
  entry,
  view,
  editable,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: entry.id,
    disabled: !editable || entry.locked,
    data: {
      entry,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${
        isDragging
          ? "z-50 opacity-70"
          : ""
      }`}
    >
      <ScheduleClassCard
        entry={entry}
        view={view}
      />

      {editable && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          <ScheduleEntryLockButton
            versionId={versionId}
            entry={entry}
          />

          {!entry.locked && (
            <button
              type="button"
              aria-label="Mover clase"
              title="Arrastra para mover la clase"
              {...listeners}
              {...attributes}
              className="cursor-grab rounded-lg bg-white/90 p-2 text-slate-800 shadow-sm backdrop-blur-sm active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}