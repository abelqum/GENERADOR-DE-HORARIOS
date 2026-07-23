"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { UserRound } from "lucide-react";

export default function TeacherAvailabilitySelector({
  teachers,
  selectedTeacherId,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(event) {
    const teacherId = event.target.value;

    const params = new URLSearchParams(
      searchParams.toString(),
    );

    if (teacherId) {
      params.set("teacher", teacherId);
    } else {
      params.delete("teacher");
    }

    router.push(`/disponibilidad?${params.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label
        htmlFor="teacherSelector"
        className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
      >
        <UserRound size={17} />
        Profesor
      </label>

      <select
        id="teacherSelector"
        value={selectedTeacherId || ""}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
      >
        <option value="">
          Selecciona un profesor
        </option>

        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.first_name} {teacher.last_name}
          </option>
        ))}
      </select>
    </div>
  );
}