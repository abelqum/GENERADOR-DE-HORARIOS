export default function Alert({
  type = "error",
  children,
}) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-700",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning:
      "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${styles[type]}`}
    >
      {children}
    </div>
  );
}