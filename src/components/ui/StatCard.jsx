export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>

          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        {Icon && (
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
            <Icon size={22} />
          </div>
        )}
      </div>
    </article>
  );
}