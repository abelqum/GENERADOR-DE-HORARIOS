import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {value}
          </p>
        </div>

        {Icon && (
          <div className="shrink-0 rounded-xl bg-slate-100 p-3 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white">
            <Icon size={22} />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-sm leading-5 text-slate-500">{description}</p>

        {href && (
          <ArrowUpRight
            size={17}
            className="shrink-0 text-slate-400 transition group-hover:text-slate-900"
          />
        )}
      </div>
    </>
  );

  const className =
    "group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}
