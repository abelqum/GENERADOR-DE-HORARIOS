"use client";

import { useActionState } from "react";
import { Building2 } from "lucide-react";
import { createSchoolAction } from "@/app/(dashboard)/configuracion/inicial/actions";

const initialState = {
  success: false,
  message: "",
};

export default function InitialSchoolForm() {
  const [state, formAction, isPending] = useActionState(
    createSchoolAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Nombre de la escuela
          </label>

          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={3}
            placeholder="Escuela Secundaria..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="code"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Clave o código
          </label>

          <input
            id="code"
            name="code"
            type="text"
            placeholder="ES-001"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Correo institucional
          </label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="contacto@escuela.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Teléfono
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="55 0000 0000"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="address"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Dirección
          </label>

          <textarea
            id="address"
            name="address"
            rows={3}
            placeholder="Dirección de la escuela"
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {state.message && (
        <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        <Building2 size={18} />

        {isPending ? "Registrando escuela..." : "Registrar escuela"}
      </button>
    </form>
  );
}