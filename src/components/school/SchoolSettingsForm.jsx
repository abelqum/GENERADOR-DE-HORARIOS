"use client";

import { Building2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Swal from "sweetalert2";

import { updateSchoolAction } from "@/app/configuracion/inicial/actions";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export default function SchoolSettingsForm({ school }) {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);

  async function handleEdit() {
    const { value: formValues } = await Swal.fire({
      title: "Editar escuela",

      width: 600,

      showCancelButton: true,

      confirmButtonText: "Guardar cambios",

      cancelButtonText: "Cancelar",

      focusConfirm: false,

      html: `
        <div style="text-align:left">
          <label
            for="school-name"
            style="
              display:block;
              margin-bottom:6px;
              font-size:14px;
              font-weight:600;
            "
          >
            Nombre de la escuela
          </label>

          <input
            id="school-name"
            class="swal2-input"
            value="${escapeHtml(school.name)}"
            style="
              width:100%;
              margin:0 0 16px 0;
            "
          />

          <label
            for="school-director-name"
            style="
              display:block;
              margin-bottom:6px;
              font-size:14px;
              font-weight:600;
            "
          >
            Nombre de la directora
          </label>

          <input
            id="school-director-name"
            class="swal2-input"
            value="${escapeHtml(school.director_name)}"
            placeholder="Ejemplo: María Guadalupe Hernández López"
            style="
              width:100%;
              margin:0 0 16px 0;
            "
          />

          <p
            style="
              margin:-8px 0 16px 0;
              color:#64748b;
              font-size:12px;
              line-height:1.5;
            "
          >
            Este nombre aparecerá debajo de la línea de firma en los horarios de los profesores.
          </p>

          <label
            for="school-code"
            style="
              display:block;
              margin-bottom:6px;
              font-size:14px;
              font-weight:600;
            "
          >
            Clave o código
          </label>

          <input
            id="school-code"
            class="swal2-input"
            value="${escapeHtml(school.code)}"
            style="
              width:100%;
              margin:0 0 16px 0;
            "
          />

          <label
            for="school-email"
            style="
              display:block;
              margin-bottom:6px;
              font-size:14px;
              font-weight:600;
            "
          >
            Correo institucional
          </label>

          <input
            id="school-email"
            type="email"
            class="swal2-input"
            value="${escapeHtml(school.email)}"
            style="
              width:100%;
              margin:0 0 16px 0;
            "
          />

          <label
            for="school-phone"
            style="
              display:block;
              margin-bottom:6px;
              font-size:14px;
              font-weight:600;
            "
          >
            Teléfono
          </label>

          <input
            id="school-phone"
            class="swal2-input"
            value="${escapeHtml(school.phone)}"
            style="
              width:100%;
              margin:0 0 16px 0;
            "
          />

          <label
            for="school-address"
            style="
              display:block;
              margin-bottom:6px;
              font-size:14px;
              font-weight:600;
            "
          >
            Dirección
          </label>

          <textarea
            id="school-address"
            class="swal2-textarea"
            style="
              width:100%;
              margin:0;
            "
          >${escapeHtml(school.address)}</textarea>
        </div>
      `,

      preConfirm: () => {
        const name = document.getElementById("school-name")?.value.trim() ?? "";

        const directorName =
          document.getElementById("school-director-name")?.value.trim() ?? "";

        const code = document.getElementById("school-code")?.value.trim() ?? "";

        const email =
          document.getElementById("school-email")?.value.trim() ?? "";

        const phone =
          document.getElementById("school-phone")?.value.trim() ?? "";

        const address =
          document.getElementById("school-address")?.value.trim() ?? "";

        if (!name || name.length < 3) {
          Swal.showValidationMessage(
            "El nombre de la escuela debe tener al menos 3 caracteres.",
          );

          return false;
        }

        if (!directorName || directorName.length < 3) {
          Swal.showValidationMessage(
            "Escribe el nombre completo de la directora.",
          );

          return false;
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          Swal.showValidationMessage("Escribe un correo institucional válido.");

          return false;
        }

        return {
          name,
          directorName,
          code,
          email,
          phone,
          address,
        };
      },
    });

    if (!formValues) {
      return;
    }

    setIsPending(true);

    Swal.fire({
      title: "Guardando escuela",

      allowOutsideClick: false,

      showConfirmButton: false,

      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const formData = new FormData();

      formData.set("name", formValues.name);

      formData.set("director_name", formValues.directorName);

      formData.set("code", formValues.code);

      formData.set("email", formValues.email);

      formData.set("phone", formValues.phone);

      formData.set("address", formValues.address);

      const result = await updateSchoolAction(formData);

      await Swal.close();

      if (!result?.success) {
        await Swal.fire({
          icon: "error",

          title: "No se pudo actualizar",

          text: result?.message || "No fue posible actualizar la escuela.",
        });

        return;
      }

      await Swal.fire({
        icon: "success",

        title: "Escuela actualizada",

        text: result.message,

        timer: 1500,

        showConfirmButton: false,
      });

      router.refresh();
    } catch (error) {
      console.error("Error actualizando escuela:", error);

      await Swal.close();

      await Swal.fire({
        icon: "error",

        title: "Ocurrió un error",

        text: "No fue posible guardar la información.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
            <Building2 size={22} />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">Escuela actual</p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {school.name}
            </h3>

            <div className="mt-3 space-y-1 text-sm text-slate-500">
              {school.director_name && <p>Directora: {school.director_name}</p>}

              {school.code && <p>Clave: {school.code}</p>}

              {school.email && <p>{school.email}</p>}

              {school.phone && <p>{school.phone}</p>}

              {school.address && <p>{school.address}</p>}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={handleEdit}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Pencil size={16} />
          Editar escuela
        </button>
      </div>
    </section>
  );
}
