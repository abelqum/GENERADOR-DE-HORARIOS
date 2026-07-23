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
  BookOpen,
  Coffee,
  LockKeyhole,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  deleteShiftPeriodAction,
  updateShiftPeriodAction,
} from "@/app/(dashboard)/configuracion/periodos/actions";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import {
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";
import { formatTime } from "@/utils/time";

const periodTypeConfiguration = {
  class: {
    label: "Clase",
    icon: BookOpen,
    className:
      "bg-blue-100 text-blue-700",
  },

  recess: {
    label: "Receso",
    icon: Coffee,
    className:
      "bg-amber-100 text-amber-700",
  },

  unavailable: {
    label: "No disponible",
    icon: LockKeyhole,
    className:
      "bg-slate-200 text-slate-700",
  },
};

function normalizeTimeForInput(time) {
  if (!time) {
    return "";
  }

  return String(time).slice(0, 5);
}

export default function ShiftPeriodsTable({
  shifts,
  periods,
}) {
  const router = useRouter();

  const [
    editingPeriodId,
    setEditingPeriodId,
  ] = useState(null);

  const [, startTransition] =
    useTransition();

  async function handleEdit(period) {
    if (editingPeriodId) {
      return;
    }

    setEditingPeriodId(period.id);

    const result = await Swal.fire({
      title: "Editar hora",

      html: `
        <div class="text-left">
          <label
            for="swal-period-number"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Número de orden
          </label>

          <input
            id="swal-period-number"
            type="number"
            min="1"
            step="1"
            class="swal2-input !m-0 !mb-4 !w-full"
          />

          <label
            for="swal-period-name"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Nombre
          </label>

          <input
            id="swal-period-name"
            type="text"
            maxlength="100"
            class="swal2-input !m-0 !mb-4 !w-full"
            placeholder="Ejemplo: Hora 1"
          />

          <label
            for="swal-period-type"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Tipo
          </label>

          <select
            id="swal-period-type"
            class="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          >
            <option value="class">
              Clase
            </option>

            <option value="recess">
              Receso
            </option>

            <option value="unavailable">
              No disponible
            </option>
          </select>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label
                for="swal-period-start"
                class="mb-2 block text-sm font-semibold text-slate-700"
              >
                Inicio
              </label>

              <input
                id="swal-period-start"
                type="time"
                class="w-full rounded-lg border border-slate-300 px-3 py-3"
              />
            </div>

            <div>
              <label
                for="swal-period-end"
                class="mb-2 block text-sm font-semibold text-slate-700"
              >
                Finalización
              </label>

              <input
                id="swal-period-end"
                type="time"
                class="w-full rounded-lg border border-slate-300 px-3 py-3"
              />
            </div>
          </div>

          <label
            for="swal-period-active"
            class="mb-2 mt-4 block text-sm font-semibold text-slate-700"
          >
            Estado
          </label>

          <select
            id="swal-period-active"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          >
            <option value="true">
              Activa
            </option>

            <option value="false">
              Inactiva
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

      didOpen: () => {
        const numberInput =
          document.getElementById(
            "swal-period-number",
          );

        const nameInput =
          document.getElementById(
            "swal-period-name",
          );

        const typeInput =
          document.getElementById(
            "swal-period-type",
          );

        const startInput =
          document.getElementById(
            "swal-period-start",
          );

        const endInput =
          document.getElementById(
            "swal-period-end",
          );

        const activeInput =
          document.getElementById(
            "swal-period-active",
          );

        if (numberInput) {
          numberInput.value =
            String(period.period_number);
        }

        if (nameInput) {
          nameInput.value =
            period.name ?? "";
        }

        if (typeInput) {
          typeInput.value =
            period.period_type;
        }

        if (startInput) {
          startInput.value =
            normalizeTimeForInput(
              period.start_time,
            );
        }

        if (endInput) {
          endInput.value =
            normalizeTimeForInput(
              period.end_time,
            );
        }

        if (activeInput) {
          activeInput.value =
            String(period.active);
        }
      },

      preConfirm: () => {
        const periodNumber =
          Number.parseInt(
            String(
              document.getElementById(
                "swal-period-number",
              )?.value ?? "",
            ),
            10,
          );

        const name = String(
          document.getElementById(
            "swal-period-name",
          )?.value ?? "",
        ).trim();

        const periodType = String(
          document.getElementById(
            "swal-period-type",
          )?.value ?? "",
        ).trim();

        const startTime = String(
          document.getElementById(
            "swal-period-start",
          )?.value ?? "",
        ).trim();

        const endTime = String(
          document.getElementById(
            "swal-period-end",
          )?.value ?? "",
        ).trim();

        const active = String(
          document.getElementById(
            "swal-period-active",
          )?.value ?? "true",
        );

        if (
          !Number.isInteger(periodNumber) ||
          periodNumber < 1
        ) {
          Swal.showValidationMessage(
            "El número de orden debe ser mayor que cero.",
          );

          return false;
        }

        if (name.length < 2) {
          Swal.showValidationMessage(
            "Escribe un nombre válido.",
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
            "La hora final debe ser posterior a la inicial.",
          );

          return false;
        }

        return {
          periodNumber,
          name,
          periodType,
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
      setEditingPeriodId(null);
      return;
    }

    const formData = new FormData();

    formData.set(
      "periodId",
      period.id,
    );

    formData.set(
      "periodNumber",
      String(
        result.value.periodNumber,
      ),
    );

    formData.set(
      "name",
      result.value.name,
    );

    formData.set(
      "periodType",
      result.value.periodType,
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
      await updateShiftPeriodAction(
        formData,
      );

    setEditingPeriodId(null);

    if (!updateResult.success) {
      await showErrorAlert({
        title:
          "No fue posible actualizar",
        text: updateResult.message,
      });

      return;
    }

    await showSuccessAlert({
      title: "Hora actualizada",
      text: updateResult.message,
    });

    startTransition(() => {
      router.refresh();
    });
  }

  if (!periods.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <BookOpen
          className="mx-auto text-slate-400"
          size={34}
        />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay horas configuradas
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Registra las horas de clase y recesos de cada turno.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {shifts.map((shift) => {
        const shiftPeriods = periods
          .filter(
            (period) =>
              period.shift_id === shift.id,
          )
          .sort(
            (firstPeriod, secondPeriod) =>
              firstPeriod.period_number -
              secondPeriod.period_number,
          );

        return (
          <section
            key={shift.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="font-bold text-slate-900">
                Turno {shift.name}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {formatTime(
                  shift.start_time,
                )}{" "}
                –{" "}
                {formatTime(
                  shift.end_time,
                )}
              </p>
            </div>

            {shiftPeriods.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Este turno todavía no tiene horas configuradas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4">
                        Orden
                      </th>

                      <th className="px-6 py-4">
                        Hora
                      </th>

                      <th className="px-6 py-4">
                        Tipo
                      </th>

                      <th className="px-6 py-4">
                        Inicio
                      </th>

                      <th className="px-6 py-4">
                        Finalización
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
                    {shiftPeriods.map(
                      (period) => {
                        const typeConfig =
                          periodTypeConfiguration[
                            period.period_type
                          ] ??
                          periodTypeConfiguration
                            .unavailable;

                        const Icon =
                          typeConfig.icon;

                        const isEditing =
                          editingPeriodId ===
                          period.id;

                        return (
                          <tr
                            key={period.id}
                            className={
                              period.active
                                ? ""
                                : "bg-slate-50 opacity-70"
                            }
                          >
                            <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                              {
                                period.period_number
                              }
                            </td>

                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">
                                {period.name}
                              </p>
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${typeConfig.className}`}
                              >
                                <Icon
                                  size={14}
                                />

                                {
                                  typeConfig.label
                                }
                              </span>
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-600">
                              {formatTime(
                                period.start_time,
                              )}
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-600">
                              {formatTime(
                                period.end_time,
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  period.active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {period.active
                                  ? "Activa"
                                  : "Inactiva"}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  title="Editar hora"
                                  disabled={
                                    isEditing
                                  }
                                  onClick={() =>
                                    handleEdit(
                                      period,
                                    )
                                  }
                                  className="rounded-lg border border-blue-200 p-2 text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"
                                >
                                  <Pencil
                                    size={16}
                                  />
                                </button>

                                <form
                                  action={
                                    deleteShiftPeriodAction
                                  }
                                >
                                  <input
                                    type="hidden"
                                    name="periodId"
                                    value={
                                      period.id
                                    }
                                  />

                                  <ConfirmSubmitButton
                                    title="Eliminar hora"
                                    message={`¿Seguro que deseas eliminar ${period.name}? Solo se eliminará si no está siendo utilizada en disponibilidades u horarios.`}
                                    confirmButtonText="Sí, eliminar"
                                    className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                                  >
                                    <Trash2
                                      size={16}
                                    />
                                  </ConfirmSubmitButton>
                                </form>
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}