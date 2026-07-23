"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function ScheduleEntitySelector({
  view,
  groups,
  teachers,
  selectedEntityId,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isGroupView = view === "group";
  const entities = isGroupView ? groups : teachers;
  const parameterName = isGroupView
    ? "grupo"
    : "profesor";

  function handleChange(event) {
    const value = event.target.value;

    const params = new URLSearchParams(
      searchParams.toString(),
    );

    params.delete(
      isGroupView ? "profesor" : "grupo",
    );

    if (value) {
      params.set(parameterName, value);
    } else {
      params.delete(parameterName);
    }

    router.push(`?${params.toString()}`);
  }

  return (
    <div className="min-w-0 flex-1 sm:max-w-sm">
      <label
        htmlFor="scheduleEntity"
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {isGroupView
          ? "Seleccionar grupo"
          : "Seleccionar profesor"}
      </label>

      <select
        id="scheduleEntity"
        value={selectedEntityId || ""}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
      >
        <option value="">
          {isGroupView
            ? "Selecciona un grupo"
            : "Selecciona un profesor"}
        </option>

        {entities.map((entity) => (
          <option
            key={entity.id}
            value={entity.id}
          >
            {isGroupView
              ? `${entity.name} · ${
                  entity.grade_level?.name ??
                  "Sin grado"
                } · ${
                  entity.shift?.name ??
                  "Sin turno"
                }`
              : `${entity.first_name} ${entity.last_name}`}
          </option>
        ))}
      </select>
    </div>
  );
}