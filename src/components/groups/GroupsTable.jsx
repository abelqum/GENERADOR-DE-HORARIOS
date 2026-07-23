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
  Pencil,
  Power,
  PowerOff,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  deleteGroupAction,
  toggleGroupAction,
  updateGroupAction,
} from "@/app/(dashboard)/grupos/actions";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import {
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";

export default function GroupsTable({
  groups,
  gradeLevels,
  shifts,
}) {
  const router = useRouter();

  const [
    editingGroupId,
    setEditingGroupId,
  ] = useState(null);

  const [, startTransition] =
    useTransition();

  function createGradeOptions(
    selectedGradeLevelId,
  ) {
    return gradeLevels
      .map(
        (gradeLevel) => `
          <option
            value="${gradeLevel.id}"
            ${
              gradeLevel.id ===
              selectedGradeLevelId
                ? "selected"
                : ""
            }
          >
            ${gradeLevel.name}
          </option>
        `,
      )
      .join("");
  }

  function createShiftOptions(
    selectedShiftId,
  ) {
    return shifts
      .map(
        (shift) => `
          <option
            value="${shift.id}"
            ${
              shift.id === selectedShiftId
                ? "selected"
                : ""
            }
          >
            ${shift.name}
          </option>
        `,
      )
      .join("");
  }

  async function handleEdit(group) {
    if (editingGroupId) {
      return;
    }

    setEditingGroupId(group.id);

    const result = await Swal.fire({
      title: "Editar grupo",

      html: `
        <div class="text-left">
          <label
            for="swal-group-name"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Nombre del grupo
          </label>

          <input
            id="swal-group-name"
            type="text"
            maxlength="50"
            class="swal2-input !m-0 !mb-4 !w-full uppercase"
            placeholder="Ejemplo: 1A"
          />

          <label
            for="swal-group-grade"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Grado
          </label>

          <select
            id="swal-group-grade"
            class="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          >
            ${createGradeOptions(
              group.grade_level_id,
            )}
          </select>

          <label
            for="swal-group-shift"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Turno
          </label>

          <select
            id="swal-group-shift"
            class="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          >
            ${createShiftOptions(
              group.shift_id,
            )}
          </select>

          <label
            for="swal-group-students"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Cantidad de estudiantes
          </label>

          <input
            id="swal-group-students"
            type="number"
            min="0"
            step="1"
            class="swal2-input !m-0 !mb-4 !w-full"
            placeholder="Cantidad opcional"
          />

          <label
            for="swal-group-active"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Estado
          </label>

          <select
            id="swal-group-active"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
          >
            <option value="true">
              Activo
            </option>

            <option value="false">
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

      didOpen: () => {
        const nameInput =
          document.getElementById(
            "swal-group-name",
          );

        const studentCountInput =
          document.getElementById(
            "swal-group-students",
          );

        const activeInput =
          document.getElementById(
            "swal-group-active",
          );

        if (nameInput) {
          nameInput.value =
            group.name ?? "";
        }

        if (
          studentCountInput &&
          group.student_count !== null &&
          group.student_count !== undefined
        ) {
          studentCountInput.value =
            String(group.student_count);
        }

        if (activeInput) {
          activeInput.value =
            String(group.active);
        }
      },

      preConfirm: () => {
        const name = String(
          document.getElementById(
            "swal-group-name",
          )?.value ?? "",
        )
          .trim()
          .toUpperCase();

        const gradeLevelId =
          String(
            document.getElementById(
              "swal-group-grade",
            )?.value ?? "",
          ).trim();

        const shiftId =
          String(
            document.getElementById(
              "swal-group-shift",
            )?.value ?? "",
          ).trim();

        const studentCount =
          String(
            document.getElementById(
              "swal-group-students",
            )?.value ?? "",
          ).trim();

        const active =
          String(
            document.getElementById(
              "swal-group-active",
            )?.value ?? "true",
          );

        if (!name) {
          Swal.showValidationMessage(
            "Escribe el nombre del grupo.",
          );

          return false;
        }

        if (name.length > 50) {
          Swal.showValidationMessage(
            "El nombre no puede superar 50 caracteres.",
          );

          return false;
        }

        if (!gradeLevelId) {
          Swal.showValidationMessage(
            "Selecciona un grado.",
          );

          return false;
        }

        if (!shiftId) {
          Swal.showValidationMessage(
            "Selecciona un turno.",
          );

          return false;
        }

        if (
          studentCount &&
          (
            !Number.isInteger(
              Number(studentCount),
            ) ||
            Number(studentCount) < 0
          )
        ) {
          Swal.showValidationMessage(
            "La cantidad de estudiantes debe ser cero o mayor.",
          );

          return false;
        }

        return {
          name,
          gradeLevelId,
          shiftId,
          studentCount,
          active,
        };
      },
    });

    if (
      !result.isConfirmed ||
      !result.value
    ) {
      setEditingGroupId(null);
      return;
    }

    const formData = new FormData();

    formData.set(
      "groupId",
      group.id,
    );

    formData.set(
      "name",
      result.value.name,
    );

    formData.set(
      "gradeLevelId",
      result.value.gradeLevelId,
    );

    formData.set(
      "shiftId",
      result.value.shiftId,
    );

    formData.set(
      "studentCount",
      result.value.studentCount,
    );

    formData.set(
      "active",
      result.value.active,
    );

    const updateResult =
      await updateGroupAction(formData);

    setEditingGroupId(null);

    if (!updateResult.success) {
      await showErrorAlert({
        title:
          "No fue posible actualizar",
        text: updateResult.message,
      });

      return;
    }

    await showSuccessAlert({
      title: "Grupo actualizado",
      text: updateResult.message,
    });

    startTransition(() => {
      router.refresh();
    });
  }

  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <UsersRound
          className="mx-auto text-slate-400"
          size={34}
        />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay grupos registrados
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Registra los grupos del ciclo escolar activo.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="font-bold text-slate-900">
          Grupos registrados
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Cada grupo está ligado a un grado, turno y ciclo
          escolar.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4">
                Grupo
              </th>

              <th className="px-6 py-4">
                Grado
              </th>

              <th className="px-6 py-4">
                Turno
              </th>

              <th className="px-6 py-4">
                Estudiantes
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
            {groups.map((group) => {
              const isEditing =
                editingGroupId === group.id;

              return (
                <tr key={group.id}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-950">
                      {group.name}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {group.grade_level?.name ||
                      "Sin grado"}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {group.shift?.name ||
                      "Sin turno"}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {group.student_count ??
                      "No especificado"}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        group.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {group.active
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        title="Editar grupo"
                        disabled={isEditing}
                        onClick={() =>
                          handleEdit(group)
                        }
                        className="rounded-lg border border-blue-200 p-2 text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"
                      >
                        <Pencil size={16} />
                      </button>

                      <form
                        action={
                          toggleGroupAction
                        }
                      >
                        <input
                          type="hidden"
                          name="groupId"
                          value={group.id}
                        />

                        <input
                          type="hidden"
                          name="nextActive"
                          value={String(
                            !group.active,
                          )}
                        />

                        <button
                          type="submit"
                          title={
                            group.active
                              ? "Desactivar grupo"
                              : "Activar grupo"
                          }
                          className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
                        >
                          {group.active ? (
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

                      <form
                        action={
                          deleteGroupAction
                        }
                      >
                        <input
                          type="hidden"
                          name="groupId"
                          value={group.id}
                        />

                        <ConfirmSubmitButton
                          title="Eliminar grupo"
                          message={`¿Seguro que deseas eliminar el grupo ${group.name}? Solo podrá eliminarse si no tiene asignaciones ni horarios relacionados.`}
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}