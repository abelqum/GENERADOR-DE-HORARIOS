"use client";

import { CalendarCheck2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import AvailabilityLegend from "@/components/availability/AvailabilityLegend";
import TeacherAvailabilityGrid from "@/components/availability/TeacherAvailabilityGrid";

export default function TeacherAvailabilityComparison({
  teacher,
  teacherShifts = [],
  availability = [],
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!teacher) {
    return null;
  }

  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="
          inline-flex items-center justify-center gap-2
          rounded-xl
          border border-blue-600
          bg-white
          px-4 py-3
          text-sm font-semibold text-blue-700
          shadow-sm
          transition

          hover:bg-blue-600
          hover:text-white

          focus:outline-none
          focus:ring-2
          focus:ring-blue-300
          focus:ring-offset-2
        "
      >
        <CalendarCheck2 size={18} />

        {isOpen ? "Ocultar disponibilidad" : "Comparar disponibilidad"}

        {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>

      {isOpen && (
        <div className="space-y-6 rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
          <header>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Comparativa
            </p>

            <h3 className="mt-1 text-2xl font-bold text-slate-950">
              Disponibilidad registrada
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Compara esta disponibilidad con el horario generado que aparece
              arriba.
            </p>
          </header>

          <AvailabilityLegend />

          <TeacherAvailabilityGrid
            teacher={teacher}
            teacherShifts={teacherShifts}
            availability={availability}
            readOnly
          />
        </div>
      )}
    </section>
  );
}
