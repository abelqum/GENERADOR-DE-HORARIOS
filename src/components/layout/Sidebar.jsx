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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-slate-800 bg-slate-950 text-white lg:block">
      <div className="flex h-20 items-center border-b border-slate-800 px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-2 text-slate-950">
            <CalendarCheck size={22} />
          </div>

          <div>
            <p className="font-bold">Horarium</p>
            <p className="text-xs text-slate-400">Gestión escolar</p>
          </div>
        </Link>
      </div>

      <nav className="p-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon size={19} />

                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}