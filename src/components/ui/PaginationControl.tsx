import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

interface PaginationControlProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  className?: string;
}

export function PaginationControl({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  className,
}: PaginationControlProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  if (totalPages <= 1 && totalItems <= pageSize) {
    return null;
  }

  return (
    <div
      className={clsx(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-surface-border text-xs text-content-muted",
        className
      )}
    >
      <div>
        Showing <span className="font-semibold text-content-primary">{startItem}</span> to{" "}
        <span className="font-semibold text-content-primary">{endItem}</span> of{" "}
        <span className="font-semibold text-content-primary">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex h-8 items-center gap-1 px-2.5 rounded-lg border border-surface-border bg-surface-raised hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-content-secondary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </button>

        <span className="px-2 font-medium text-content-secondary">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex h-8 items-center gap-1 px-2.5 rounded-lg border border-surface-border bg-surface-raised hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-content-secondary"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
