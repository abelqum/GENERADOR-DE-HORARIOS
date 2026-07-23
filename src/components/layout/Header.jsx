import { Building2, UserRound } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";

export default function Header({ user, school }) {
  const fullName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Administrador";

  return (
    <header className="flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-500">
          {school?.name || "Sistema escolar"}
        </p>

        <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
          Generador de horarios
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 md:flex">
          <Building2 size={18} />

          <span>{school?.code || "Escuela registrada"}</span>
        </div>

        <div className="hidden items-center gap-2 text-sm text-slate-600 xl:flex">
          <UserRound size={17} />

          <span>{fullName}</span>
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}