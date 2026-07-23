"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAction } from "@/app/(auth)/actions";

const initialState = {
  success: false,
  message: "",
};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Acceso administrativo
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Iniciar sesión
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Ingresa con la cuenta administradora de la escuela.
        </p>
      </div>

      <div className="mt-7 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Correo electrónico
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="directora@escuela.com"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Contraseña
          </label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Tu contraseña"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {state.message && (
        <div
          className={`mt-5 rounded-xl px-4 py-3 text-sm ${
            state.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn size={18} />

        {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Todavía no existe la cuenta?{" "}
        <Link
          href="/registro"
          className="font-semibold text-slate-950 hover:underline"
        >
          Registrar administrador
        </Link>
      </p>
    </form>
  );
}