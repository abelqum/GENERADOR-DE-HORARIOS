"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Settings,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Profesores",
    href: "/profesores",
    icon: Users,
  },
  {
    name: "Materias",
    href: "/materias",
    icon: BookOpen,
  },
  {
    name: "Grupos",
    href: "/grupos",
    icon: GraduationCap,
  },
  {
    name: "Asignaciones",
    href: "/asignaciones",
    icon: ClipboardList,
  },
  {
    name: "Disponibilidad",
    href: "/disponibilidad",
    icon: UserRoundCheck,
  },
  {
    name: "Generador",
    href: "/generador",
    icon: CalendarClock,
  },
  {
    name: "Horarios",
    href: "/horarios",
    icon: CalendarCheck,
  },
  {
    name: "Configuración",
    href: "/configuracion",
    icon: Settings,
  },
];

function isRouteActive(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ onClose, showCloseButton }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-5">
        <Link
          href="/"
          onClick={onClose}
          className="flex min-w-0 items-center gap-3"
        >
          <div className="shrink-0 rounded-xl bg-white p-2 text-slate-950">
            <CalendarCheck size={22} />
          </div>

          <div className="min-w-0">
            <p className="truncate font-bold text-white">Horarium</p>

            <p className="truncate text-xs text-slate-400">Gestión escolar</p>
          </div>
        </Link>

        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="rounded-xl p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={22} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            const active = isRouteActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon size={19} className="shrink-0" />

                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-slate-800 p-4">
        <div className="rounded-xl bg-slate-900 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sistema privado
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Generación y administración de horarios escolares.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({
  variant = "desktop",
  isOpen = false,
  onClose = () => {},
}) {
  if (variant === "mobile") {
    return (
      <aside
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 left-0 z-50 w-[86%] max-w-72 border-r border-slate-800 bg-slate-950 text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent onClose={onClose} showCloseButton />
      </aside>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800 bg-slate-950 text-white lg:block">
      <SidebarContent onClose={() => {}} showCloseButton={false} />
    </aside>
  );
}
