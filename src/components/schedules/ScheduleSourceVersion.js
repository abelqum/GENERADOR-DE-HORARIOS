import Link from "next/link";
import { GitBranch } from "lucide-react";

export default function ScheduleSourceVersion({
  sourceVersion,
}) {
  if (!sourceVersion) {
    return null;
  }

  return (
    <div className="mt-4 inline-flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-800">
      <GitBranch
        size={18}
        className="mt-0.5 shrink-0"
      />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
          Versión de origen
        </p>

        <Link
          href={`/horarios/${sourceVersion.id}`}
          className="mt-1 block text-sm font-bold hover:underline"
        >
          {sourceVersion.name || "Versión anterior"}
        </Link>

        <p className="mt-1 text-xs text-violet-600">
          Este horario fue generado mediante una
          reoptimización de la versión anterior.
        </p>
      </div>
    </div>
  );
}