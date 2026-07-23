"use client";

import { GraduationCap, LayoutGrid, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const VIEWS = [
  {
    value: "group",
    label: "Por grupo",
    icon: GraduationCap,
  },
  {
    value: "teacher",
    label: "Por profesor",
    icon: UserRound,
  },
  {
    value: "general",
    label: "Vista general",
    icon: LayoutGrid,
  },
];

export default function ScheduleViewSelector({ selectedView }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleViewChange(nextView) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("vista", nextView);

    /*
     * Al cambiar de vista eliminamos
     * selecciones anteriores.
     *
     * La vista general no necesita
     * grupo ni profesor seleccionado.
     */
    params.delete("grupo");
    params.delete("profesor");

    router.push(`?${params.toString()}`);
  }

  return (
    <div className="inline-flex max-w-full flex-wrap rounded-xl border border-slate-300 bg-white p-1">
      {VIEWS.map((view) => {
        const Icon = view.icon;

        const active = selectedView === view.value;

        return (
          <button
            key={view.value}
            type="button"
            onClick={() => handleViewChange(view.value)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Icon size={17} />

            {view.label}
          </button>
        );
      })}
    </div>
  );
}
