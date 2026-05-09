import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";
import type { SortDir } from "@/hooks/useTableSort";

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Identifier matching the key passed to useTableSort accessors. */
  sortKey: string;
  /** Currently active sort key (from useTableSort). */
  currentKey: string | null;
  /** Currently active direction (from useTableSort). */
  direction: SortDir;
  /** Toggle handler from useTableSort. */
  onSort: (key: string) => void;
}

/**
 * Drop-in replacement for shadcn TableHead that turns the column into a
 * three-state sort toggle: idle → asc → desc → idle. Renders an arrow
 * indicating the current direction, or a neutral both-arrows hint when idle.
 */
export const SortableTableHead = React.forwardRef<HTMLTableCellElement, SortableTableHeadProps>(
  ({ className, sortKey, currentKey, direction, onSort, children, ...props }, ref) => {
    const isActive = currentKey === sortKey && direction !== null;
    const Icon =
      isActive && direction === "asc"
        ? ChevronUp
        : isActive && direction === "desc"
          ? ChevronDown
          : ChevronsUpDown;

    return (
      <TableHead ref={ref} className={cn("p-0", className)} {...props}>
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={cn(
            "flex h-12 w-full items-center gap-1.5 px-4 text-left font-medium transition-colors",
            "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            isActive ? "text-foreground" : "text-muted-foreground",
          )}
          aria-sort={
            isActive ? (direction === "asc" ? "ascending" : "descending") : "none"
          }
        >
          <span>{children}</span>
          <Icon
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-opacity",
              isActive ? "opacity-100" : "opacity-40",
            )}
          />
        </button>
      </TableHead>
    );
  },
);
SortableTableHead.displayName = "SortableTableHead";
