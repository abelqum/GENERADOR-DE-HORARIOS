import {
  Archive,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import {
  archiveScheduleVersionAction,
  deleteScheduleVersionAction,
  publishScheduleVersionAction,
  restoreScheduleVersionAction,
} from "@/app/(dashboard)/horarios/actions";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";

export default function ScheduleVersionActions({
  version,
  integrityValid = true,
}) {
  const isDraft =
    version.status === "draft";

  const isPublished =
    version.status === "published";

  const isArchived =
    version.status === "archived";

  return (
    <div className="flex flex-wrap gap-3">
      {isDraft && (
        <form
          action={
            publishScheduleVersionAction
          }
        >
          <input
            type="hidden"
            name="versionId"
            value={version.id}
          />

          <button
            type="submit"
            disabled={!integrityValid}
            title={
              integrityValid
                ? "Publicar versión"
                : "La versión está incompleta y no puede publicarse"
            }
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            <Send size={17} />
            Publicar versión
          </button>
        </form>
      )}

      {isPublished && (
        <form
          action={
            archiveScheduleVersionAction
          }
        >
          <input
            type="hidden"
            name="versionId"
            value={version.id}
          />

          <ConfirmSubmitButton
            title="Archivar horario"
            message="La versión dejará de estar publicada, pero se conservará junto con todas sus clases."
            confirmButtonText="Sí, archivar"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Archive size={17} />
            Archivar
          </ConfirmSubmitButton>
        </form>
      )}

      {isArchived && (
        <form
          action={
            restoreScheduleVersionAction
          }
        >
          <input
            type="hidden"
            name="versionId"
            value={version.id}
          />

          <ConfirmSubmitButton
            title="Restaurar versión"
            message="La versión volverá al estado de borrador y podrá modificarse nuevamente."
            confirmButtonText="Sí, restaurar"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <RotateCcw size={17} />
            Restaurar como borrador
          </ConfirmSubmitButton>
        </form>
      )}

      {!isPublished && (
        <form
          action={
            deleteScheduleVersionAction
          }
        >
          <input
            type="hidden"
            name="versionId"
            value={version.id}
          />

          <ConfirmSubmitButton
            title="Eliminar versión"
            message="Se eliminarán el horario y todas sus clases. Esta acción no puede deshacerse."
            confirmButtonText="Sí, eliminar"
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={17} />
            Eliminar versión
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  );
}