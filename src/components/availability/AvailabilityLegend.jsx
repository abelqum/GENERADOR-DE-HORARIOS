import {
  AVAILABILITY_OPTIONS,
} from "@/constants/availability";

export default function AvailabilityLegend() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-900">
        Estados disponibles
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {AVAILABILITY_OPTIONS.map((option) => (
          <article
            key={option.value}
            className={`rounded-xl border p-3 ${option.className}`}
          >
            <p className="text-sm font-semibold">
              {option.label}
            </p>

            <p className="mt-1 text-xs leading-5 opacity-80">
              {option.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}