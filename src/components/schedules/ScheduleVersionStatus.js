import {
  Archive,
  CheckCircle2,
  FileClock,
} from "lucide-react";

const statusConfiguration = {
  draft: {
    label: "Borrador",
    description:
      "Esta versión todavía puede revisarse antes de publicarla.",
    icon: FileClock,
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
  },

  published: {
    label: "Publicado",
    description:
      "Esta es la versión oficial del ciclo escolar.",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },

  archived: {
    label: "Archivado",
    description:
      "Esta versión se conserva como historial.",
    icon: Archive,
    className:
      "border-slate-300 bg-slate-100 text-slate-600",
  },
};

export default function ScheduleVersionStatus({
  status,
}) {
  const configuration =
    statusConfiguration[status] ??
    statusConfiguration.draft;

  const Icon = configuration.icon;

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border px-4 py-3 ${configuration.className}`}
    >
      <Icon size={19} />

      <div>
        <p className="text-sm font-bold">
          {configuration.label}
        </p>

        <p className="mt-0.5 text-xs opacity-80">
          {configuration.description}
        </p>
      </div>
    </div>
  );
}