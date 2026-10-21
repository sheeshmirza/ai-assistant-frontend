import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading data..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Loader2 className="h-8 w-8 text-primary-600 dark:text-primary-400 animate-spin mb-3" />
      <p className="text-sm font-medium text-content-secondary">{message}</p>
    </div>
  );
}

