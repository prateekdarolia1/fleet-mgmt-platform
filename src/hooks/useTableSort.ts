import { useCallback, useMemo, useState } from "react";

export type SortDir = "asc" | "desc" | null;

/**
 * Pulls the sortable value out of a row. Return `null`/`undefined` for
 * "missing" — the comparator always pushes those to the end.
 */
export type SortAccessor<T> = (row: T) => string | number | Date | null | undefined;

interface SortState {
  key: string | null;
  dir: SortDir;
}

interface UseTableSortResult<T> {
  sortedRows: T[];
  sortKey: string | null;
  sortDir: SortDir;
  /** Click a header — cycles asc → desc → off. Switching to a new key starts at asc. */
  toggleSort: (key: string) => void;
}

/**
 * Adds three-state column sorting to any list of rows.
 *
 * Usage:
 *   const sort = useTableSort(rows, {
 *     name: r => r.name,
 *     joinDate: r => r.join_date,
 *   });
 *
 *   <SortableTableHead sortKey="name" {...sort}>Name</SortableTableHead>
 *   ...
 *   {sort.sortedRows.map(...)}
 *
 * String compares are locale-aware and natural-numeric ("EVP2" < "EVP10").
 * Nulls/undefined always sort last regardless of direction.
 */
export function useTableSort<T>(
  rows: T[],
  accessors: Record<string, SortAccessor<T>>,
  initial?: { key: string; dir: Exclude<SortDir, null> },
): UseTableSortResult<T> {
  const [state, setState] = useState<SortState>(() =>
    initial ? { key: initial.key, dir: initial.dir } : { key: null, dir: null },
  );

  const toggleSort = useCallback((key: string) => {
    setState((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  }, []);

  const sortedRows = useMemo(() => {
    if (!state.key || !state.dir) return rows;
    const accessor = accessors[state.key];
    if (!accessor) return rows;

    const dirMul = state.dir === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);

      const aMissing = av === null || av === undefined || av === "";
      const bMissing = bv === null || bv === undefined || bv === "";
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;

      if (av instanceof Date || bv instanceof Date) {
        const at = av instanceof Date ? av.getTime() : new Date(av as string).getTime();
        const bt = bv instanceof Date ? bv.getTime() : new Date(bv as string).getTime();
        return (at - bt) * dirMul;
      }

      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dirMul;
      }

      return String(av).localeCompare(String(bv), undefined, {
        sensitivity: "base",
        numeric: true,
      }) * dirMul;
    });
  }, [rows, state, accessors]);

  return {
    sortedRows,
    sortKey: state.key,
    sortDir: state.dir,
    toggleSort,
  };
}
