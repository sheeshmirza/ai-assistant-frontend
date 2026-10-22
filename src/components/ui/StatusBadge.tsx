import React from "react";
import clsx from "clsx";

export type StatusVariant = "active" | "draft" | "completed" | "ended" | "archived" | "deleted" | "failed" | string;

interface StatusBadgeProps {
  status: StatusVariant;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();

  let colorClasses = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  let dotColor = "bg-slate-400";

  if (normalized === "active" || normalized === "ready" || normalized === "open") {
    colorClasses = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    dotColor = "bg-emerald-500";
  } else if (normalized === "draft" || normalized === "pending") {
    colorClasses = "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    dotColor = "bg-amber-500";
  } else if (normalized === "completed" || normalized === "ended") {
    colorClasses = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800";
    dotColor = "bg-indigo-500";
  } else if (normalized === "failed" || normalized === "deleted" || normalized === "error") {
    colorClasses = "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800";
    dotColor = "bg-rose-500";
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize",
        colorClasses,
        className
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
      {status}
    </span>
  );
}
