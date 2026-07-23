import Link from "next/link";
import { GitCompareArrows } from "lucide-react";

export default function OpenComparisonButton({
  versionId,
}) {
  if (!versionId) {
    return null;
  }

  return (
    <Link
      href={`/horarios/${versionId}/comparar`}
      className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
    >
      <GitCompareArrows size={17} />
      Comparar versiones
    </Link>
  );
}