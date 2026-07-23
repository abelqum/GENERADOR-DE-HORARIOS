import { CalendarCheck } from "lucide-react";

export default function AuthLayout({ children }) {
  return (
    <main className="grid min-h-screen bg-slate-100 lg:grid-cols-2">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-2 text-slate-950">
            <CalendarCheck size={24} />
          </div>

          <div>
            <p className="font-bold">Horarium</p>
            <p className="text-xs text-slate-400">Gestión escolar</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Generador escolar
          </p>

          <h1 className="mt-5 text-5xl font-bold leading-tight">
            Construye horarios escolares sin empalmes.
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Administra profesores, materias, grupos y preferencias docentes
            desde una sola aplicación.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          Sistema de administración de horarios escolares
        </p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
} 