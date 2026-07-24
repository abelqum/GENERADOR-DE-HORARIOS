"use client";

import { Building2, Menu, UserRound } from "lucide-react";

import LogoutButton from "@/components/auth/LogoutButton";

export default function Header({ userName, userEmail, school, onOpenMenu }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:min-h-20 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Abrir menú"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
          >
            <Menu size={21} />
          </button>

          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
              {school?.name || "Sistema escolar"}
            </p>

            <h1 className="truncate text-base font-bold text-slate-900 sm:text-xl">
              Generador de horarios
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 md:flex">
            <Building2 size={17} className="shrink-0" />

            <span className="max-w-44 truncate">
              {school?.code || "Escuela registrada"}
            </span>
          </div>

          <div className="hidden min-w-0 items-center gap-2 xl:flex">
            <div className="rounded-full bg-slate-100 p-2 text-slate-600">
              <UserRound size={17} />
            </div>

            <div className="max-w-48 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {userName}
              </p>

              {userEmail && (
                <p className="truncate text-xs text-slate-500">{userEmail}</p>
              )}
            </div>
          </div>

          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
