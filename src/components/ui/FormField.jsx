export default function FormField({
  label,
  htmlFor,
  error,
  description,
  children,
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      {children}

      {description && !error && (
        <p className="mt-2 text-xs text-slate-500">
          {description}
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}