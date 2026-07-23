"use client";

import { useMemo, useState } from "react";
import ValidationResultsList from "@/components/generator/ValidationResultsList";

const filters = [
  {
    value: "all",
    label: "Todos",
  },
  {
    value: "error",
    label: "Errores",
  },
  {
    value: "warning",
    label: "Advertencias",
  },
  {
    value: "info",
    label: "Información",
  },
  {
    value: "success",
    label: "Correctos",
  },
];

export default function ValidationResultsPanel({
  results,
}) {
  const [selectedFilter, setSelectedFilter] =
    useState("all");

  const filteredResults = useMemo(() => {
    if (selectedFilter === "all") {
      return results;
    }

    return results.filter(
      (result) =>
        result.level === selectedFilter,
    );
  }, [results, selectedFilter]);

  return (
    <section>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Resultados de validación
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Revisa los puntos detectados antes de generar.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const count =
              filter.value === "all"
                ? results.length
                : results.filter(
                    (result) =>
                      result.level === filter.value,
                  ).length;

            const active =
              selectedFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  setSelectedFilter(filter.value)
                }
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <ValidationResultsList
        results={filteredResults}
      />
    </section>
  );
}