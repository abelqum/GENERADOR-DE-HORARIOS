"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
  useTransition,
} from "react";
import Swal from "sweetalert2";
import {
  Clock3,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import {
  deleteShiftAction,
  toggleShiftAction,
  updateShiftAction,
} from "@/app/(dashboard)/configuracion/turnos/actions";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import {
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";
import { formatTime } from "@/utils/time";

function normalizeTimeForInput(time) {
  if (!time) {
    return "";
  }

  return String(time).slice(0, 5);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function ShiftsTable({
  shifts,
}) {
  const router = useRouter();

  const [
    editingShiftId,
    setEditingShiftId,
  ] = useState(null);

  const [, startTransition] =
    useTransition();

  async function handleEdit(shift) {
    if (editingShiftId) {
      return;
    }

    setEditingShiftId(shift.id);

    const result = await Swal.fire({
      title: "Editar turno",

      html: `
        <div class="text-left">
          <label
            for="swal-shift-name"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Nombre del turno
          </label>

          <input
            id="swal-shift-name"
            type="text"
            maxlength="100"
            value="${escapeHtml(
              shift.name,
            )}"
            class="swal2-input !m-0 !mb-4 !w-full"
            placeholder="Ejemplo: Matutino"
          />

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label
                for="swal-shift-start"
                class="mb-2 block text-sm font-semibold text-slate-700"
              >
                Hora de inicio
              </label>

              <input
                id="swal-shift-start"
                type="time"
                value="${normalizeTimeForInput(
                  shift.start_time,
                )}"
                class="w-full rounded-lg border border-slate-300 px-3 py-3"
              />
            </div>

            <div>
              <label
                for="swal-shift-end"
                class="mb-2 block text-sm font-semibold text-slate-700"
              >
                Hora de finalización
              </label>

              <input
                id="swal-shift-end"
                type="time"
                value="${normalizeTimeForInput(
                  shift.end_time,
                )}"
                class="w-full rounded-lg border border-slate-300 px-3 py-3"
              />
            </div>
          </div>

          <label
            for="swal-shift-active"
            class="mb-2 mt-4 block text-sm font-semibold text-slate-700"
          >
            Estado
          </label>

          <select
            id="swal-shift-active"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          >
            <option
              value="true"
              ${
                shift.active
                  ? "selected"
                  : ""
              }
            >
              Activo
            </option>

            <option
              value="false"
              ${
                !shift.active
                  ? "selected"
                  : ""
              }
            >
              Inactivo
            </option>
          </select>
        </div>
      `,

      showCancelButton: true,
      confirmButtonText:
        "Guardar cambios",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusConfirm: false,

      confirmButtonColor: "#0f172a",
      cancelButtonColor: "#64748b",

      preConfirm: () => {
        const name = String(
          document.getElementById(
            "swal-shift-name",
          )?.value ?? "",
        ).trim();

        const startTime = String(
          document.getElementById(
            "swal-shift-start",
          )?.value ?? "",
        ).trim();

        const endTime = String(
          document.getElementById(
            "swal-shift-end",
          )?.value ?? "",
        ).trim();

        const active = String(
          document.getElementById(
            "swal-shift-active",
          )?.value ?? "true",
        );

        if (name.length < 2) {
          Swal.showValidationMessage(
            "El nombre debe contener al menos dos caracteres.",
          );

          return false;
        }

        if (!startTime || !endTime) {
          Swal.showValidationMessage(
            "Especifica la hora de inicio y finalización.",
          );

          return false;
        }

        if (startTime >= endTime) {
          Swal.showValidationMessage(
            "La hora final debe ser posterior a la hora inicial.",
          );

          return false;
        }

        return {
          name,
          startTime,
          endTime,
          active,
        };
      },
    });

    if (
      !result.isConfirmed ||
      !result.value
    ) {
      setEditingShiftId(null);
      return;
    }

    const formData = new FormData();

    formData.set(
      "shiftId",
      shift.id,
    );

    formData.set(
      "name",
      result.value.name,
    );

    formData.set(
      "startTime",
      result.value.startTime,
    );

    formData.set(
      "endTime",
      result.value.endTime,
    );

    formData.set(
      "active",
      result.value.active,
    );

    const updateResult =
      await updateShiftAction(
        formData,
      );

    setEditingShiftId(null);

    if (!updateResult.success) {
      await showErrorAlert({
        title:
          "No fue posible actualizar",
        text: updateResult.message,
      });

      return;
    }

    await showSuccessAlert({
      title: "Turno actualizado",
      text: updateResult.message,
    });

    startTransition(() => {
      router.refresh();
    });
  }

  if (!shifts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Clock3
          className="mx-auto text-slate-400"
          size={34}
        />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay turnos registrados
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Registra el turno matutino, vespertino u otro turno
          utilizado por la escuela.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="font-bold text-slate-900">
          Turnos registrados
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Las horas de clase se configuran posteriormente para cada
          turno.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4">
                Turno
              </th>

              <th className="px-6 py-4">
                Inicio
              </th>

              <th className="px-6 py-4">
                Finalización
              </th>

              <th className="px-6 py-4">
                Horas
              </th>

              <th className="px-6 py-4">
                Estado
              </th>

              <th className="px-6 py-4 text-right">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {shifts.map((shift) => {
              const isEditing =
                editingShiftId ===
                shift.id;

              return (
                <tr key={shift.id}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">
                      {shift.name}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatTime(
                      shift.start_time,
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatTime(
                      shift.end_time,
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {shift.periodsCount}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        shift.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {shift.active
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        title="Editar turno"
                        disabled={isEditing}
                        onClick={() =>
                          handleEdit(shift)
                        }
                        className="rounded-lg border border-blue-200 p-2 text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"
                      >
                        <Pencil size={16} />
                      </button>

                      <form
                        action={
                          toggleShiftAction
                        }
                      >
                        <input
                          type="hidden"
                          name="shiftId"
                          value={shift.id}
                        />

                        <input
                          type="hidden"
                          name="nextActive"
                          value={String(
                            !shift.active,
                          )}
                        />

                        <button
                          type="submit"
                          title={
                            shift.active
                              ? "Desactivar turno"
                              : "Activar turno"
                          }
                          className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
                        >
                          {shift.active ? (
                            <PowerOff
                              size={16}
                            />
                          ) : (
                            <Power
                              size={16}
                            />
                          )}
                        </button>
                      </form>

                      {shift.periodsCount ===
                        0 && (
                        <form
                          action={
                            deleteShiftAction
                          }
                        >
                          <input
                            type="hidden"
                            name="shiftId"
                            value={
                              shift.id
                            }
                          />

                          <ConfirmSubmitButton
                            title="Eliminar turno"
                            message={`¿Seguro que deseas eliminar el turno ${shift.name}? Esta acción no puede deshacerse.`}
                            confirmButtonText="Sí, eliminar"
                            className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2
                              size={16}
                            />
                          </ConfirmSubmitButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}