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
  CalendarRange,
  Check,
  Minus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  deleteCurriculumRequirementAction,
  updateCurriculumRequirementAction,
} from "@/app/(dashboard)/materias/carga/actions";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import {
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";

export default function CurriculumRequirementsTable({
  requirements,
}) {
  const router = useRouter();

  const [
    editingRequirementId,
    setEditingRequirementId,
  ] = useState(null);

  const [, startTransition] =
    useTransition();

  async function handleEdit(requirement) {
    if (editingRequirementId) {
      return;
    }

    setEditingRequirementId(
      requirement.id,
    );

    const result = await Swal.fire({
      title: "Editar carga curricular",

      html: `
        <div class="text-left">
          <div class="mb-5 rounded-xl bg-slate-100 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Materia y grado
            </p>

            <p class="mt-1 font-semibold text-slate-900">
              ${
                requirement.subject?.name ||
                "Sin materia"
              }
              ·
              ${
                requirement.grade_level?.name ||
                "Sin grado"
              }
            </p>
          </div>

          <label
            for="swal-weekly-periods"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Horas semanales
          </label>

          <input
            id="swal-weekly-periods"
            type="number"
            min="1"
            max="50"
            step="1"
            class="swal2-input !m-0 !mb-4 !w-full"
          />

          <label
            for="swal-max-daily"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Máximo de horas por día
          </label>

          <input
            id="swal-max-daily"
            type="number"
            min="1"
            max="10"
            step="1"
            class="swal2-input !m-0 !mb-4 !w-full"
          />

          <label
            for="swal-min-days"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Mínimo de días por semana
          </label>

          <input
            id="swal-min-days"
            type="number"
            min="1"
            max="7"
            step="1"
            class="swal2-input !m-0 !mb-4 !w-full"
          />

          <label
            for="swal-block-size"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Tamaño de bloque preferido
          </label>

          <input
            id="swal-block-size"
            type="number"
            min="1"
            max="5"
            step="1"
            class="swal2-input !m-0 !mb-4 !w-full"
          />

          <label
            class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <input
              id="swal-allow-consecutive"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300"
            />

            <span>
              <span class="block text-sm font-semibold text-slate-800">
                Permitir horas consecutivas
              </span>

              <span class="block text-xs text-slate-500">
                Útil para talleres, laboratorios o clases dobles.
              </span>
            </span>
          </label>
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
        const weeklyInput =
          document.getElementById(
            "swal-weekly-periods",
          );

        const maxDailyInput =
          document.getElementById(
            "swal-max-daily",
          );

        const minDaysInput =
          document.getElementById(
            "swal-min-days",
          );

        const blockSizeInput =
          document.getElementById(
            "swal-block-size",
          );

        const consecutiveInput =
          document.getElementById(
            "swal-allow-consecutive",
          );

        if (weeklyInput) {
          weeklyInput.value = String(
            requirement.weekly_periods,
          );
        }

        if (maxDailyInput) {
          maxDailyInput.value = String(
            requirement.max_periods_per_day,
          );
        }

        if (minDaysInput) {
          minDaysInput.value = String(
            requirement.min_days_per_week,
          );
        }

        if (blockSizeInput) {
          blockSizeInput.value = String(
            requirement.preferred_block_size,
          );
        }

        if (consecutiveInput) {
          consecutiveInput.checked =
            Boolean(
              requirement.allow_consecutive_periods,
            );
        }
      },

      preConfirm: () => {
        const weeklyPeriods =
          Number.parseInt(
            String(
              document.getElementById(
                "swal-weekly-periods",
              )?.value ?? "",
            ),
            10,
          );

        const maxPeriodsPerDay =
          Number.parseInt(
            String(
              document.getElementById(
                "swal-max-daily",
              )?.value ?? "",
            ),
            10,
          );

        const minDaysPerWeek =
          Number.parseInt(
            String(
              document.getElementById(
                "swal-min-days",
              )?.value ?? "",
            ),
            10,
          );

        const preferredBlockSize =
          Number.parseInt(
            String(
              document.getElementById(
                "swal-block-size",
              )?.value ?? "",
            ),
            10,
          );

        const allowConsecutivePeriods =
          Boolean(
            document.getElementById(
              "swal-allow-consecutive",
            )?.checked,
          );

        if (
          !Number.isInteger(
            weeklyPeriods,
          ) ||
          weeklyPeriods < 1
        ) {
          Swal.showValidationMessage(
            "Las horas semanales deben ser mayores que cero.",
          );

          return false;
        }

        if (
          !Number.isInteger(
            maxPeriodsPerDay,
          ) ||
          maxPeriodsPerDay < 1
        ) {
          Swal.showValidationMessage(
            "El máximo diario debe ser mayor que cero.",
          );

          return false;
        }

        if (
          maxPeriodsPerDay >
          weeklyPeriods
        ) {
          Swal.showValidationMessage(
            "El máximo diario no puede superar las horas semanales.",
          );

          return false;
        }

        if (
          !Number.isInteger(
            minDaysPerWeek,
          ) ||
          minDaysPerWeek < 1 ||
          minDaysPerWeek > 7
        ) {
          Swal.showValidationMessage(
            "El mínimo de días debe estar entre 1 y 7.",
          );

          return false;
        }

        if (
          minDaysPerWeek >
          weeklyPeriods
        ) {
          Swal.showValidationMessage(
            "El mínimo de días no puede superar las horas semanales.",
          );

          return false;
        }

        if (
          !Number.isInteger(
            preferredBlockSize,
          ) ||
          preferredBlockSize < 1
        ) {
          Swal.showValidationMessage(
            "El tamaño del bloque debe ser mayor que cero.",
          );

          return false;
        }

        if (
          !allowConsecutivePeriods &&
          preferredBlockSize > 1
        ) {
          Swal.showValidationMessage(
            "Activa las horas consecutivas para usar bloques mayores a uno.",
          );

          return false;
        }

        if (
          preferredBlockSize >
          maxPeriodsPerDay
        ) {
          Swal.showValidationMessage(
            "El bloque no puede superar el máximo diario.",
          );

          return false;
        }

        return {
          weeklyPeriods,
          maxPeriodsPerDay,
          minDaysPerWeek,
          preferredBlockSize,
          allowConsecutivePeriods,
        };
      },
    });

    if (
      !result.isConfirmed ||
      !result.value
    ) {
      setEditingRequirementId(null);
      return;
    }

    const formData = new FormData();

    formData.set(
      "requirementId",
      requirement.id,
    );

    formData.set(
      "weeklyPeriods",
      String(
        result.value.weeklyPeriods,
      ),
    );

    formData.set(
      "maxPeriodsPerDay",
      String(
        result.value.maxPeriodsPerDay,
      ),
    );

    formData.set(
      "minDaysPerWeek",
      String(
        result.value.minDaysPerWeek,
      ),
    );

    formData.set(
      "preferredBlockSize",
      String(
        result.value.preferredBlockSize,
      ),
    );

    formData.set(
      "allowConsecutivePeriods",
      String(
        result.value
          .allowConsecutivePeriods,
      ),
    );

    const updateResult =
      await updateCurriculumRequirementAction(
        formData,
      );

    setEditingRequirementId(null);

    if (!updateResult.success) {
      await showErrorAlert({
        title:
          "No fue posible actualizar",
        text: updateResult.message,
      });

      return;
    }

    await showSuccessAlert({
      title:
        "Carga curricular actualizada",
      text: updateResult.message,
    });

    startTransition(() => {
      router.refresh();
    });
  }

  if (!requirements.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <CalendarRange
          className="mx-auto text-slate-400"
          size={34}
        />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay cargas configuradas
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Relaciona las materias con cada grado escolar.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="font-bold text-slate-900">
          Carga curricular
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Define cuántas horas recibe cada grado por materia.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4">
                Materia
              </th>

              <th className="px-6 py-4">
                Grado
              </th>

              <th className="px-6 py-4">
                Semanales
              </th>

              <th className="px-6 py-4">
                Máximo diario
              </th>

              <th className="px-6 py-4">
                Mínimo días
              </th>

              <th className="px-6 py-4">
                Consecutivas
              </th>

              <th className="px-6 py-4">
                Bloque
              </th>

              <th className="px-6 py-4 text-right">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {requirements.map(
              (requirement) => {
                const isEditing =
                  editingRequirementId ===
                  requirement.id;

                return (
                  <tr key={requirement.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{
                            backgroundColor:
                              requirement.subject
                                ?.color ||
                              "#334155",
                          }}
                        />

                        <p className="font-semibold text-slate-900">
                          {requirement.subject
                            ?.name ||
                            "Sin materia"}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {requirement.grade_level
                        ?.name ||
                        "Sin grado"}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {
                        requirement.weekly_periods
                      }
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {
                        requirement.max_periods_per_day
                      }
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {
                        requirement.min_days_per_week
                      }
                    </td>

                    <td className="px-6 py-4">
                      {requirement.allow_consecutive_periods ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <Check size={13} />
                          Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          <Minus size={13} />
                          No
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {
                        requirement.preferred_block_size
                      }
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="Editar carga curricular"
                          disabled={isEditing}
                          onClick={() =>
                            handleEdit(
                              requirement,
                            )
                          }
                          className="rounded-lg border border-blue-200 p-2 text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"
                        >
                          <Pencil size={16} />
                        </button>

                        <form
                          action={
                            deleteCurriculumRequirementAction
                          }
                        >
                          <input
                            type="hidden"
                            name="requirementId"
                            value={
                              requirement.id
                            }
                          />

                          <ConfirmSubmitButton
                            title="Eliminar carga curricular"
                            message={`¿Seguro que deseas eliminar la carga de ${requirement.subject?.name ?? "esta materia"} para ${requirement.grade_level?.name ?? "este grado"}?`}
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
    </div>
  );
}