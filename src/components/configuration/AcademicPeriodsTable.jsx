"use client";

import {
  CalendarCheck,
  CheckCircle2,
  Pencil,
  Power,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Swal from "sweetalert2";

import {
  deleteAcademicPeriodAction,
  setActiveAcademicPeriodAction,
  updateAcademicPeriodAction,
} from "@/app/(dashboard)/configuracion/ciclos/actions";

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function createFormData(values) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, String(value ?? ""));
  }

  return formData;
}

export default function AcademicPeriodsTable({ academicPeriods }) {
  const router = useRouter();

  const [processingId, setProcessingId] = useState(null);

  async function handleEdit(academicPeriod) {
    const { value: formValues } = await Swal.fire({
      title: "Editar ciclo escolar",
      width: 560,
      showCancelButton: true,
      confirmButtonText: "Guardar cambios",
      cancelButtonText: "Cancelar",
      focusConfirm: false,
      html: `
          <div style="text-align:left">
            <label
              for="academic-period-name"
              style="display:block; margin-bottom:6px; font-size:14px; font-weight:600;"
            >
              Nombre del ciclo
            </label>

            <input
              id="academic-period-name"
              class="swal2-input"
              value="${academicPeriod.name}"
              style="width:100%; margin:0 0 18px 0;"
            />

            <label
              for="academic-period-start-date"
              style="display:block; margin-bottom:6px; font-size:14px; font-weight:600;"
            >
              Fecha de inicio
            </label>

            <input
              id="academic-period-start-date"
              type="date"
              class="swal2-input"
              value="${academicPeriod.start_date}"
              style="width:100%; margin:0 0 18px 0;"
            />

            <label
              for="academic-period-end-date"
              style="display:block; margin-bottom:6px; font-size:14px; font-weight:600;"
            >
              Fecha de finalización
            </label>

            <input
              id="academic-period-end-date"
              type="date"
              class="swal2-input"
              value="${academicPeriod.end_date}"
              style="width:100%; margin:0;"
            />
          </div>
        `,
      preConfirm: () => {
        const name = document
          .getElementById("academic-period-name")
          ?.value.trim();

        const startDate = document.getElementById(
          "academic-period-start-date",
        )?.value;

        const endDate = document.getElementById(
          "academic-period-end-date",
        )?.value;

        if (!name || name.length < 3) {
          Swal.showValidationMessage(
            "El nombre debe tener al menos 3 caracteres.",
          );

          return false;
        }

        if (!startDate || !endDate) {
          Swal.showValidationMessage("Captura ambas fechas.");

          return false;
        }

        if (endDate < startDate) {
          Swal.showValidationMessage(
            "La fecha final no puede ser anterior a la inicial.",
          );

          return false;
        }

        return {
          name,
          startDate,
          endDate,
        };
      },
    });

    if (!formValues) {
      return;
    }

    setProcessingId(academicPeriod.id);

    Swal.fire({
      title: "Guardando cambios",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const formData = createFormData({
        academicPeriodId: academicPeriod.id,
        name: formValues.name,
        startDate: formValues.startDate,
        endDate: formValues.endDate,
      });

      const result = await updateAcademicPeriodAction(formData);

      await Swal.close();

      if (!result?.success) {
        await Swal.fire({
          icon: "error",
          title: "No se pudo actualizar",
          text:
            result?.message || "No fue posible actualizar el ciclo escolar.",
        });

        return;
      }

      await Swal.fire({
        icon: "success",
        title: "Ciclo actualizado",
        text: result.message,
        timer: 1400,
        showConfirmButton: false,
      });

      router.refresh();
    } catch (error) {
      console.error("Error editando ciclo:", error);

      await Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Ocurrió un error",
        text: "No fue posible guardar los cambios.",
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleActivate(academicPeriod) {
    const confirmation = await Swal.fire({
      icon: "question",
      title: "¿Activar este ciclo?",
      text: "Este ciclo será utilizado para grupos, asignaciones y horarios.",
      showCancelButton: true,
      confirmButtonText: "Sí, activar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setProcessingId(academicPeriod.id);

    try {
      const formData = createFormData({
        academicPeriodId: academicPeriod.id,
      });

      const result = await setActiveAcademicPeriodAction(formData);

      if (!result?.success) {
        await Swal.fire({
          icon: "error",
          title: "No se pudo activar",
          text: result?.message || "No fue posible activar el ciclo.",
        });

        return;
      }

      await Swal.fire({
        icon: "success",
        title: "Ciclo activado",
        text: result.message,
        timer: 1400,
        showConfirmButton: false,
      });

      router.refresh();
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(academicPeriod) {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar ciclo escolar?",
      html: `
          <p>
            Se intentará eliminar
            <strong>${academicPeriod.name}</strong>.
          </p>

          <p style="margin-top:10px; font-size:13px; color:#64748b;">
            No podrá eliminarse si tiene información relacionada.
          </p>
        `,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setProcessingId(academicPeriod.id);

    Swal.fire({
      title: "Eliminando ciclo",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const formData = createFormData({
        academicPeriodId: academicPeriod.id,
      });

      const result = await deleteAcademicPeriodAction(formData);

      await Swal.close();

      if (!result?.success) {
        await Swal.fire({
          icon: "error",
          title: "No se pudo eliminar",
          text: result?.message || "No fue posible eliminar el ciclo escolar.",
        });

        return;
      }

      await Swal.fire({
        icon: "success",
        title: "Ciclo eliminado",
        text: result.message,
        timer: 1400,
        showConfirmButton: false,
      });

      router.refresh();
    } catch (error) {
      console.error("Error eliminando ciclo:", error);

      await Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Ocurrió un error",
        text: "No fue posible eliminar el ciclo escolar.",
      });
    } finally {
      setProcessingId(null);
    }
  }

  if (!academicPeriods.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <CalendarCheck className="mx-auto text-slate-400" size={34} />

        <h3 className="mt-4 font-bold text-slate-900">
          No hay ciclos escolares
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Registra el primer ciclo utilizando el formulario.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="font-bold text-slate-900">Ciclos registrados</h3>

        <p className="mt-1 text-sm text-slate-500">
          Solamente puede existir un ciclo activo.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-4">Ciclo escolar</th>

              <th className="px-6 py-4">Inicio</th>

              <th className="px-6 py-4">Finalización</th>

              <th className="px-6 py-4">Estado</th>

              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {academicPeriods.map((academicPeriod) => {
              const isProcessing = processingId === academicPeriod.id;

              return (
                <tr key={academicPeriod.id}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">
                      {academicPeriod.name}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(academicPeriod.start_date)}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(academicPeriod.end_date)}
                  </td>

                  <td className="px-6 py-4">
                    {academicPeriod.active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={14} />
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Inactivo
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleEdit(academicPeriod)}
                        aria-label={`Editar ${academicPeriod.name}`}
                        className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Pencil size={16} />
                      </button>

                      {!academicPeriod.active && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleActivate(academicPeriod)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Power size={14} />
                          Activar
                        </button>
                      )}

                      {!academicPeriod.active && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleDelete(academicPeriod)}
                          aria-label={`Eliminar ${academicPeriod.name}`}
                          className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
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
