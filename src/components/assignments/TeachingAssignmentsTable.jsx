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
  ClipboardList,
  Lock,
  LockOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  deleteTeachingAssignmentAction,
  toggleTeachingAssignmentLockAction,
  updateTeachingAssignmentAction,
} from "@/app/(dashboard)/asignaciones/actions";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import {
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function TeachingAssignmentsTable({
  assignments,
  teachers,
}) {
  const router = useRouter();

  const [
    editingAssignmentId,
    setEditingAssignmentId,
  ] = useState(null);

  const [, startTransition] =
    useTransition();

  function createTeacherOptions(
    selectedTeacherId,
  ) {
    return teachers
      .map((teacher) => {
        const teacherName = [
          teacher.first_name,
          teacher.last_name,
        ]
          .filter(Boolean)
          .join(" ");

        const employeeNumber =
          teacher.employee_number
            ? ` · ${teacher.employee_number}`
            : "";

        return `
          <option
            value="${escapeHtml(
              teacher.id,
            )}"
            ${
              teacher.id ===
              selectedTeacherId
                ? "selected"
                : ""
            }
          >
            ${escapeHtml(
              teacherName,
            )}${escapeHtml(
              employeeNumber,
            )}
          </option>
        `;
      })
      .join("");
  }

  async function handleEdit(assignment) {
    if (editingAssignmentId) {
      return;
    }

    setEditingAssignmentId(
      assignment.id,
    );

    const result = await Swal.fire({
      title: "Editar asignación",

      html: `
        <div class="text-left">
          <div class="mb-5 rounded-xl bg-slate-100 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Grupo y materia
            </p>

            <p class="mt-1 font-semibold text-slate-900">
              ${escapeHtml(
                assignment.group?.name ??
                  "Sin grupo",
              )}
              ·
              ${escapeHtml(
                assignment.subject?.name ??
                  "Sin materia",
              )}
            </p>
          </div>

          <label
            for="swal-assignment-teacher"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Profesor
          </label>

          <select
            id="swal-assignment-teacher"
            class="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          >
            ${createTeacherOptions(
              assignment.teacher?.id,
            )}
          </select>

          <label
            for="swal-assignment-weekly"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Horas semanales
          </label>

          <input
            id="swal-assignment-weekly"
            type="number"
            min="1"
            max="50"
            step="1"
            class="swal2-input !m-0 !mb-4 !w-full"
          />

          <label
            for="swal-assignment-max-daily"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Máximo de horas por día
          </label>

          <input
            id="swal-assignment-max-daily"
            type="number"
            min="1"
            max="10"
            step="1"
            class="swal2-input !m-0 !mb-4 !w-full"
          />

          <label
            for="swal-assignment-min-days"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Mínimo de días por semana
          </label>

          <input
            id="swal-assignment-min-days"
            type="number"
            min="1"
            max="7"
            step="1"
            class="swal2-input !m-0 !mb-4 !w-full"
          />

          <label
            for="swal-assignment-block-size"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Tamaño de bloque preferido
          </label>

          <input
            id="swal-assignment-block-size"
            type="number"
            min="1"
            max="5"
            step="1"
            class="swal2-input !m-0 !mb-4 !w-full"
          />

          <label
            class="mb-3 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <input
              id="swal-assignment-consecutive"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300"
            />

            <span>
              <span class="block text-sm font-semibold text-slate-800">
                Permitir horas consecutivas
              </span>

              <span class="block text-xs text-slate-500">
                Permite clases dobles o bloques continuos.
              </span>
            </span>
          </label>

          <label
            class="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <input
              id="swal-assignment-locked"
              type="checkbox"
              class="h-4 w-4 rounded border-amber-300"
            />

            <span>
              <span class="block text-sm font-semibold text-amber-900">
                Bloquear asignación
              </span>

              <span class="block text-xs text-amber-700">
                OR-Tools deberá conservar esta asignación según sus restricciones.
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
            "swal-assignment-weekly",
          );

        const maxDailyInput =
          document.getElementById(
            "swal-assignment-max-daily",
          );

        const minDaysInput =
          document.getElementById(
            "swal-assignment-min-days",
          );

        const blockSizeInput =
          document.getElementById(
            "swal-assignment-block-size",
          );

        const consecutiveInput =
          document.getElementById(
            "swal-assignment-consecutive",
          );

        const lockedInput =
          document.getElementById(
            "swal-assignment-locked",
          );

        if (weeklyInput) {
          weeklyInput.value = String(
            assignment.weekly_periods,
          );
        }

        if (maxDailyInput) {
          maxDailyInput.value = String(
            assignment.max_periods_per_day,
          );
        }

        if (minDaysInput) {
          minDaysInput.value = String(
            assignment.min_days_per_week,
          );
        }

        if (blockSizeInput) {
          blockSizeInput.value = String(
            assignment.preferred_block_size,
          );
        }

        if (consecutiveInput) {
          consecutiveInput.checked =
            Boolean(
              assignment.allow_consecutive_periods,
            );
        }

        if (lockedInput) {
          lockedInput.checked =
            Boolean(assignment.locked);
        }
      },

      preConfirm: () => {
        const teacherId = String(
          document.getElementById(
            "swal-assignment-teacher",
          )?.value ?? "",
        ).trim();

        const weeklyPeriods =
          Number.parseInt(
            String(
              document.getElementById(
                "swal-assignment-weekly",
              )?.value ?? "",
            ),
            10,
          );

        const maxPeriodsPerDay =
          Number.parseInt(
            String(
              document.getElementById(
                "swal-assignment-max-daily",
              )?.value ?? "",
            ),
            10,
          );

        const minDaysPerWeek =
          Number.parseInt(
            String(
              document.getElementById(
                "swal-assignment-min-days",
              )?.value ?? "",
            ),
            10,
          );

        const preferredBlockSize =
          Number.parseInt(
            String(
              document.getElementById(
                "swal-assignment-block-size",
              )?.value ?? "",
            ),
            10,
          );

        const allowConsecutivePeriods =
          Boolean(
            document.getElementById(
              "swal-assignment-consecutive",
            )?.checked,
          );

        const locked =
          Boolean(
            document.getElementById(
              "swal-assignment-locked",
            )?.checked,
          );

        if (!teacherId) {
          Swal.showValidationMessage(
            "Selecciona un profesor.",
          );

          return false;
        }

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
          preferredBlockSize >
          maxPeriodsPerDay
        ) {
          Swal.showValidationMessage(
            "El bloque no puede superar el máximo diario.",
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

        return {
          teacherId,
          weeklyPeriods,
          maxPeriodsPerDay,
          minDaysPerWeek,
          preferredBlockSize,
          allowConsecutivePeriods,
          locked,
        };
      },
    });

    if (
      !result.isConfirmed ||
      !result.value
    ) {
      setEditingAssignmentId(null);
      return;
    }

    const formData = new FormData();

    formData.set(
      "assignmentId",
      assignment.id,
    );

    formData.set(
      "teacherId",
      result.value.teacherId,
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

    formData.set(
      "locked",
      String(result.value.locked),
    );

    const updateResult =
      await updateTeachingAssignmentAction(
        formData,
      );

    setEditingAssignmentId(null);

    if (!updateResult.success) {
      await showErrorAlert({
        title:
          "No fue posible actualizar",
        text: updateResult.message,
      });

      return;
    }

    await showSuccessAlert({
      title: "Asignación actualizada",
      text: updateResult.message,
    });

    startTransition(() => {
      router.refresh();
    });
  }

  if (!assignments.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <ClipboardList
          className="mx-auto text-slate-400"
          size={34}
        />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay asignaciones docentes
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Asigna profesores a las materias de cada grupo.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="font-bold text-slate-900">
          Asignaciones registradas
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Estas asignaciones serán utilizadas por OR-Tools para
          construir el horario.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4">
                Grupo
              </th>

              <th className="px-6 py-4">
                Materia
              </th>

              <th className="px-6 py-4">
                Profesor
              </th>

              <th className="px-6 py-4">
                Semanal
              </th>

              <th className="px-6 py-4">
                Máximo diario
              </th>

              <th className="px-6 py-4">
                Mínimo días
              </th>

              <th className="px-6 py-4">
                Bloque
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
            {assignments.map(
              (assignment) => {
                const isEditing =
                  editingAssignmentId ===
                  assignment.id;

                return (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-950">
                        {assignment.group?.name ??
                          "Sin grupo"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {assignment.group
                          ?.grade_level?.name ??
                          "Sin grado"}{" "}
                        ·{" "}
                        {assignment.group
                          ?.shift?.name ??
                          "Sin turno"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              assignment.subject
                                ?.color ||
                              "#334155",
                          }}
                        />

                        <div>
                          <p className="font-semibold text-slate-900">
                            {assignment.subject
                              ?.name ??
                              "Sin materia"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {assignment.subject
                              ?.code ||
                              "Sin código"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">
                        {
                          assignment.teacher
                            ?.first_name
                        }{" "}
                        {
                          assignment.teacher
                            ?.last_name
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {assignment.teacher
                          ?.employee_number ||
                          "Sin número de empleado"}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {
                        assignment.weekly_periods
                      }
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {
                        assignment.max_periods_per_day
                      }
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {
                        assignment.min_days_per_week
                      }
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {
                        assignment.preferred_block_size
                      }

                      {assignment.allow_consecutive_periods
                        ? " consecutivas"
                        : ""}
                    </td>

                    <td className="px-6 py-4">
                      {assignment.locked ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          <Lock size={13} />
                          Bloqueada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          <LockOpen size={13} />
                          Editable
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="Editar asignación"
                          disabled={isEditing}
                          onClick={() =>
                            handleEdit(
                              assignment,
                            )
                          }
                          className="rounded-lg border border-blue-200 p-2 text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"
                        >
                          <Pencil size={16} />
                        </button>

                        <form
                          action={
                            toggleTeachingAssignmentLockAction
                          }
                        >
                          <input
                            type="hidden"
                            name="assignmentId"
                            value={
                              assignment.id
                            }
                          />

                          <input
                            type="hidden"
                            name="nextLocked"
                            value={String(
                              !assignment.locked,
                            )}
                          />

                          <button
                            type="submit"
                            title={
                              assignment.locked
                                ? "Desbloquear asignación"
                                : "Bloquear asignación"
                            }
                            className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
                          >
                            {assignment.locked ? (
                              <LockOpen
                                size={16}
                              />
                            ) : (
                              <Lock
                                size={16}
                              />
                            )}
                          </button>
                        </form>

                        <form
                          action={
                            deleteTeachingAssignmentAction
                          }
                        >
                          <input
                            type="hidden"
                            name="assignmentId"
                            value={
                              assignment.id
                            }
                          />

                          <ConfirmSubmitButton
                            title="Eliminar asignación"
                            message={`¿Seguro que deseas eliminar la asignación de ${assignment.subject?.name ?? "esta materia"} para el grupo ${assignment.group?.name ?? ""}?`}
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