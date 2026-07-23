"use client";

import {
  useState,
  useTransition,
} from "react";
import {
  saveAvailabilityCellAction,
} from "@/app/(dashboard)/disponibilidad/actions";
import {
  AVAILABILITY_OPTIONS,
  getAvailabilityConfiguration,
} from "@/constants/availability";
import {
  showErrorAlert,
} from "@/lib/alerts/swal";

export default function AvailabilityCell({
  teacherId,
  dayOfWeek,
  periodId,
  initialType = "available",
}) {
  const [
    availabilityType,
    setAvailabilityType,
  ] = useState(initialType);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const configuration =
    getAvailabilityConfiguration(
      availabilityType,
    );

  function handleChange(event) {
    const previousType =
      availabilityType;

    const nextType =
      event.target.value;

    setAvailabilityType(nextType);

    const formData =
      new FormData();

    formData.set(
      "teacherId",
      teacherId,
    );

    formData.set(
      "dayOfWeek",
      String(dayOfWeek),
    );

    formData.set(
      "shiftPeriodId",
      periodId,
    );

    formData.set(
      "availabilityType",
      nextType,
    );

    startTransition(async () => {
      const result =
        await saveAvailabilityCellAction(
          formData,
        );

      if (!result?.success) {
        setAvailabilityType(
          previousType,
        );

        await showErrorAlert({
          title:
            "No fue posible guardar",
          text:
            result?.message ??
            "Ocurrió un error inesperado.",
        });
      }
    });
  }

  return (
    <div
      className={`min-w-[138px] rounded-lg border p-1 transition ${
        configuration.activeClassName
      } ${
        isPending
          ? "opacity-60"
          : ""
      }`}
    >
      <select
        value={availabilityType}
        onChange={handleChange}
        disabled={isPending}
        aria-label={`Disponibilidad del día ${dayOfWeek}`}
        className="w-full cursor-pointer bg-transparent px-2 py-2 text-xs font-semibold outline-none disabled:cursor-wait"
      >
        {AVAILABILITY_OPTIONS.map(
          (option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.shortLabel}
            </option>
          ),
        )}
      </select>
    </div>
  );
}