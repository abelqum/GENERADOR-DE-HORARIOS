"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Swal from "sweetalert2";

import { updateTeacherAction } from "@/app/(dashboard)/profesores/actions";
import { showErrorAlert, showSuccessAlert } from "@/lib/alerts/swal";

function getInputValue(id) {
  return String(document.getElementById(id)?.value ?? "").trim();
}

export default function TeacherEditButton({ teacher }) {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);

  const [, startTransition] = useTransition();

  async function handleEdit() {
    if (isPending) {
      return;
    }

    const result = await Swal.fire({
      title: "Editar profesor",
      width: 680,

      html: `
        <div class="grid gap-4 text-left sm:grid-cols-2">
          <div>
            <label
              for="teacher-first-name"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              Nombre
            </label>

            <input
              id="teacher-first-name"
              type="text"
              class="swal2-input !m-0 !w-full"
            />
          </div>

          <div>
            <label
              for="teacher-last-name"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              Apellidos
            </label>

            <input
              id="teacher-last-name"
              type="text"
              class="swal2-input !m-0 !w-full"
            />
          </div>

          <div>
            <label
              for="teacher-employee-number"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              Número de empleado
            </label>

            <input
              id="teacher-employee-number"
              type="text"
              class="swal2-input !m-0 !w-full"
            />
          </div>

          <div>
            <label
              for="teacher-email"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              Correo
            </label>

            <input
              id="teacher-email"
              type="email"
              class="swal2-input !m-0 !w-full"
            />
          </div>

          <div>
            <label
              for="teacher-phone"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              Teléfono
            </label>

            <input
              id="teacher-phone"
              type="text"
              class="swal2-input !m-0 !w-full"
            />
          </div>

          <div>
            <label
              for="teacher-active"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              Estado
            </label>

            <select
              id="teacher-active"
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

          <div>
            <label
              for="teacher-max-weekly"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              Máximo semanal
            </label>

            <input
              id="teacher-max-weekly"
              type="number"
              min="1"
              class="swal2-input !m-0 !w-full"
            />
          </div>

          <div>
            <label
              for="teacher-max-daily"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              Máximo diario
            </label>

            <input
              id="teacher-max-daily"
              type="number"
              min="1"
              class="swal2-input !m-0 !w-full"
            />
          </div>

          <div class="sm:col-span-2">
            <label
              for="teacher-notes"
              class="mb-2 block text-sm font-semibold text-slate-700"
            >
              Notas
            </label>

            <textarea
              id="teacher-notes"
              rows="3"
              class="swal2-textarea !m-0 !w-full"
            ></textarea>
          </div>
        </div>
      `,

      showCancelButton: true,
      confirmButtonText: "Guardar cambios",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      focusConfirm: false,
      confirmButtonColor: "#0f172a",
      cancelButtonColor: "#64748b",

      didOpen: () => {
        document.getElementById("teacher-first-name").value =
          teacher.first_name ?? "";

        document.getElementById("teacher-last-name").value =
          teacher.last_name ?? "";

        document.getElementById("teacher-employee-number").value =
          teacher.employee_number ?? "";

        document.getElementById("teacher-email").value = teacher.email ?? "";

        document.getElementById("teacher-phone").value = teacher.phone ?? "";

        document.getElementById("teacher-max-weekly").value =
          teacher.max_weekly_periods ?? 1;

        document.getElementById("teacher-max-daily").value =
          teacher.max_daily_periods ?? 1;

        document.getElementById("teacher-notes").value = teacher.notes ?? "";

        document.getElementById("teacher-active").value = String(
          teacher.active,
        );
      },

      preConfirm: () => {
        const firstName = getInputValue("teacher-first-name");

        const lastName = getInputValue("teacher-last-name");

        const employeeNumber = getInputValue("teacher-employee-number");

        const email = getInputValue("teacher-email");

        const phone = getInputValue("teacher-phone");

        const notes = getInputValue("teacher-notes");

        const active = getInputValue("teacher-active");

        const maxWeeklyPeriods = Number.parseInt(
          getInputValue("teacher-max-weekly"),
          10,
        );

        const maxDailyPeriods = Number.parseInt(
          getInputValue("teacher-max-daily"),
          10,
        );

        if (!firstName) {
          Swal.showValidationMessage("Escribe el nombre del profesor.");

          return false;
        }

        if (!lastName) {
          Swal.showValidationMessage("Escribe los apellidos del profesor.");

          return false;
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          Swal.showValidationMessage("El correo electrónico no es válido.");

          return false;
        }

        if (!Number.isInteger(maxWeeklyPeriods) || maxWeeklyPeriods < 1) {
          Swal.showValidationMessage(
            "El máximo semanal debe ser mayor que cero.",
          );

          return false;
        }

        if (!Number.isInteger(maxDailyPeriods) || maxDailyPeriods < 1) {
          Swal.showValidationMessage(
            "El máximo diario debe ser mayor que cero.",
          );

          return false;
        }

        if (maxDailyPeriods > maxWeeklyPeriods) {
          Swal.showValidationMessage(
            "El máximo diario no puede superar el máximo semanal.",
          );

          return false;
        }

        return {
          firstName,
          lastName,
          employeeNumber,
          email,
          phone,
          notes,
          active,
          maxWeeklyPeriods,
          maxDailyPeriods,
        };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    setIsPending(true);

    Swal.fire({
      title: "Guardando profesor",
      text: "Espera mientras se actualizan los datos.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,

      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const formData = new FormData();

      formData.set("teacherId", teacher.id);

      Object.entries(result.value).forEach(([key, value]) => {
        formData.set(key, String(value ?? ""));
      });

      const updateResult = await updateTeacherAction(null, formData);

      Swal.close();

      if (!updateResult?.success) {
        await showErrorAlert({
          title: "No fue posible actualizar",
          text:
            updateResult?.message || "No fue posible actualizar al profesor.",
        });

        return;
      }

      await showSuccessAlert({
        title: "Profesor actualizado",
        text: updateResult.message,
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Error actualizando profesor:", error);

      Swal.close();

      await showErrorAlert({
        title: "No fue posible actualizar",
        text: "Ocurrió un error inesperado.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleEdit}
      title="Editar profesor"
      className="rounded-lg border border-blue-200 p-2 text-blue-700 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"
    >
      <Pencil size={16} />
    </button>
  );
}
