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
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import {
  deleteSubjectAction,
  toggleSubjectAction,
  updateSubjectAction,
} from "@/app/(dashboard)/materias/actions";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";
import {
  showErrorAlert,
  showSuccessAlert,
} from "@/lib/alerts/swal";

export default function SubjectsTable({
  subjects,
}) {
  const router = useRouter();

  const [
    editingSubjectId,
    setEditingSubjectId,
  ] = useState(null);

  const [, startTransition] =
    useTransition();

  async function handleEdit(subject) {
    if (editingSubjectId) {
      return;
    }

    setEditingSubjectId(subject.id);

    const result = await Swal.fire({
      title: "Editar materia",

      html: `
        <div class="text-left">
          <label
            for="swal-subject-name"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Nombre
          </label>

          <input
            id="swal-subject-name"
            type="text"
            maxlength="100"
            class="swal2-input !m-0 !mb-4 !w-full"
            placeholder="Nombre de la materia"
          />

          <label
            for="swal-subject-code"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Código
          </label>

          <input
            id="swal-subject-code"
            type="text"
            maxlength="30"
            class="swal2-input !m-0 !mb-4 !w-full"
            placeholder="Ejemplo: MAT"
          />

          <label
            for="swal-subject-color"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Color
          </label>

          <input
            id="swal-subject-color"
            type="color"
            class="mb-4 h-12 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
          />

          <label
            for="swal-subject-active"
            class="mb-2 block text-sm font-semibold text-slate-700"
          >
            Estado
          </label>

          <select
            id="swal-subject-active"
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
        const nameInput =
          document.getElementById(
            "swal-subject-name",
          );

        const codeInput =
          document.getElementById(
            "swal-subject-code",
          );

        const colorInput =
          document.getElementById(
            "swal-subject-color",
          );

        const activeInput =
          document.getElementById(
            "swal-subject-active",
          );

        if (nameInput) {
          nameInput.value =
            subject.name ?? "";
        }

        if (codeInput) {
          codeInput.value =
            subject.code ?? "";
        }

        if (colorInput) {
          colorInput.value =
            subject.color || "#2563eb";
        }

        if (activeInput) {
          activeInput.value = String(
            subject.active,
          );
        }
      },

      preConfirm: () => {
        const name = String(
          document.getElementById(
            "swal-subject-name",
          )?.value ?? "",
        ).trim();

        const code = String(
          document.getElementById(
            "swal-subject-code",
          )?.value ?? "",
        ).trim();

        const color = String(
          document.getElementById(
            "swal-subject-color",
          )?.value ?? "",
        ).trim();

        const active = String(
          document.getElementById(
            "swal-subject-active",
          )?.value ?? "true",
        );

        if (name.length < 2) {
          Swal.showValidationMessage(
            "El nombre debe contener al menos dos caracteres.",
          );

          return false;
        }

        if (
          !/^#[0-9A-Fa-f]{6}$/.test(color)
        ) {
          Swal.showValidationMessage(
            "Selecciona un color válido.",
          );

          return false;
        }

        return {
          name,
          code,
          color,
          active,
        };
      },
    });

    if (!result.isConfirmed || !result.value) {
      setEditingSubjectId(null);
      return;
    }

    const formData = new FormData();

    formData.set(
      "subjectId",
      subject.id,
    );

    formData.set(
      "name",
      result.value.name,
    );

    formData.set(
      "code",
      result.value.code,
    );

    formData.set(
      "color",
      result.value.color,
    );

    formData.set(
      "active",
      result.value.active,
    );

    const updateResult =
      await updateSubjectAction(formData);

    setEditingSubjectId(null);

    if (!updateResult.success) {
      await showErrorAlert({
        title:
          "No fue posible actualizar",
        text: updateResult.message,
      });

      return;
    }

    await showSuccessAlert({
      title: "Materia actualizada",
      text: updateResult.message,
    });

    startTransition(() => {
      router.refresh();
    });
  }

  if (!subjects.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <BookOpen
          className="mx-auto text-slate-400"
          size={34}
        />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay materias registradas
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Registra las materias utilizadas por la escuela.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="font-bold text-slate-900">
          Materias registradas
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Administra el nombre, código, color y estado de cada
          materia.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4">
                Materia
              </th>

              <th className="px-6 py-4">
                Código
              </th>

              <th className="px-6 py-4">
                Cargas
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
            {subjects.map((subject) => {
              const isEditing =
                editingSubjectId ===
                subject.id;

              return (
                <tr key={subject.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                        style={{
                          backgroundColor:
                            subject.color ||
                            "#e2e8f0",
                        }}
                      />

                      <p className="font-semibold text-slate-900">
                        {subject.name}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {subject.code ||
                      "Sin código"}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {subject.curriculumCount}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        subject.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {subject.active
                        ? "Activa"
                        : "Inactiva"}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        title="Editar materia"
                        disabled={isEditing}
                        onClick={() =>
                          handleEdit(subject)
                        }
                        className="rounded-lg border border-blue-200 p-2 text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"
                      >
                        <Pencil size={16} />
                      </button>

                      <form
                        action={
                          toggleSubjectAction
                        }
                      >
                        <input
                          type="hidden"
                          name="subjectId"
                          value={subject.id}
                        />

                        <input
                          type="hidden"
                          name="nextActive"
                          value={String(
                            !subject.active,
                          )}
                        />

                        <button
                          type="submit"
                          title={
                            subject.active
                              ? "Desactivar materia"
                              : "Activar materia"
                          }
                          className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
                        >
                          {subject.active ? (
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

                      {subject.curriculumCount ===
                        0 &&
                        subject.teacherSubjectsCount ===
                          0 &&
                        subject.assignmentsCount ===
                          0 && (
                          <form
                            action={
                              deleteSubjectAction
                            }
                          >
                            <input
                              type="hidden"
                              name="subjectId"
                              value={subject.id}
                            />

                            <ConfirmSubmitButton
                              title="Eliminar materia"
                              message={`¿Seguro que deseas eliminar ${subject.name}? Esta acción no puede deshacerse.`}
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