import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-surface-border bg-surface-raised/40">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-raised text-content-muted mb-4 border border-surface-border shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-content-primary mb-1">{title}</h3>
      <p className="text-xs text-content-muted max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
