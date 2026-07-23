import {
  BookOpen,
  Lock,
  UserRound,
  UsersRound,
} from "lucide-react";

function getReadableTextColor(hexColor) {
  if (
    !hexColor ||
    !/^#[0-9A-Fa-f]{6}$/.test(hexColor)
  ) {
    return "#0F172A";
  }

  const red = Number.parseInt(
    hexColor.slice(1, 3),
    16,
  );

  const green = Number.parseInt(
    hexColor.slice(3, 5),
    16,
  );

  const blue = Number.parseInt(
    hexColor.slice(5, 7),
    16,
  );

  const luminance =
    0.299 * red +
    0.587 * green +
    0.114 * blue;

  return luminance > 165
    ? "#0F172A"
    : "#FFFFFF";
}

export default function ScheduleClassCard({
  entry,
  view,
}) {
  const subject = entry.subject;
  const teacher = entry.teacher;
  const group = entry.group;

  const backgroundColor =
    subject?.color || "#E2E8F0";

  const textColor =
    getReadableTextColor(backgroundColor);

  return (
    <article
      className="min-h-28 rounded-xl border border-black/10 p-3 shadow-sm"
      style={{
        backgroundColor,
        color: textColor,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold opacity-80">
            <BookOpen size={13} />

            {subject?.code ||
              "Materia"}
          </p>

          <h4 className="mt-1 truncate font-bold">
            {subject?.name ||
              "Materia sin nombre"}
          </h4>
        </div>

        {entry.locked && (
          <Lock
            size={15}
            aria-label="Clase bloqueada"
          />
        )}
      </div>

      <div className="mt-4 space-y-1.5 text-xs font-medium">
        {view === "group" ? (
          <p className="flex items-center gap-1.5">
            <UserRound size={13} />

            <span className="truncate">
              {teacher
                ? `${teacher.first_name} ${teacher.last_name}`
                : "Sin profesor"}
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-1.5">
            <UsersRound size={13} />

            <span className="truncate">
              {group?.name || "Sin grupo"}
            </span>
          </p>
        )}
      </div>
    </article>
  );
}