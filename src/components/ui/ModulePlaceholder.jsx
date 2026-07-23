export default function ModulePlaceholder({
  title,
  description,
  children,
}) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Módulo
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-900">{title}</h2>

        <p className="mt-2 max-w-3xl text-slate-600">{description}</p>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
        {children || (
          <p className="text-center text-slate-500">
            Este módulo será desarrollado en el siguiente bloque.
          </p>
        )}
      </section>
    </div>
  );
}