import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <LogOut size={17} />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </form>
  );
}