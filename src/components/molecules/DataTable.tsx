/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { memo, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { geistSans } from "@/src/lib/fonts";

export interface Column<T> {
  key: string;
  header: string;
  isHead?: boolean;
  width?: string;
  customTableHead?: (value: string) => ReactNode;
  render?: (row: T) => ReactNode;
}

type MetaDataOptions = {
  endPage?: number;
  currentPage?: number;
  totalRecords?: number;
  onPageChange?: (skip: number) => void;
};

type SearchProps = {
  value: string;
  onChange: (val: string) => void;
  onSearch: () => void;
  placeholder?: string;
};

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  keyExtractor: (row: T) => string;
  className?: string;
  numberColName?: string;
  pagination?: boolean;
  metaData?: MetaDataOptions;
  emptyStateProps?: {
    icon?: string;
    title?: string;
    text?: string;
  };
  searchProps?: SearchProps;
  shouldNotHaveBorder?: boolean;
  nonScrollable?: boolean;
  noFooterOverlap?: boolean;
}

const THEAD_H = 47;
const MAX_BODY_H = 990;
const FOOTER_H = 68;

function PagBtn({ small, disabled, onClick, icon }: {
  small?: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-h-0 min-w-0 rounded-lg border border-[#D0D5DD] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] disabled:cursor-not-allowed ${small ? "p-1.5" : "p-2"}`}
    >
      <Icon
        icon={icon}
        className={small ? "w-4 h-4" : "w-5 h-5"}
        style={{ color: disabled ? "#34405490" : "#344054" }}
      />
    </button>
  );
}

function DataTable<T>({
  columns,
  data,
  loading,
  emptyMessage = "No records found",
  keyExtractor,
  className,
  numberColName,
  emptyStateProps,
  pagination,
  metaData,
  searchProps,
  shouldNotHaveBorder = false,
  nonScrollable = false,
  noFooterOverlap = true,
}: DataTableProps<T>) {
  const [isBottom, setIsBottom] = useState(false);
  const [bodyH, setBodyH] = useState(0);
  const container = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);

  const onSearchRef = useRef(searchProps?.onSearch);
  useEffect(() => {
    onSearchRef.current = searchProps?.onSearch;
  }, [searchProps?.onSearch]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      onSearchRef.current?.();
    }, 500);
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = container.current;
    if (!sentinel || !root) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsBottom(!!entry.isIntersecting),
      { root, threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [JSON.stringify(data), loading]);

  useEffect(() => {
    if (!noFooterOverlap) return;
    const el = tbodyRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setBodyH(entry.contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [noFooterOverlap]);

  const footerPad = pagination ? 50 : 0;
  const containerHeight = loading
    ? "700px"
    : data.length
      ? noFooterOverlap && bodyH > 0
        ? `${(nonScrollable ? bodyH : Math.min(bodyH, MAX_BODY_H)) + THEAD_H + FOOTER_H}px`
        : nonScrollable
          ? `${(99 * data.length + 45 + footerPad) / 16}rem`
          : `${(99 * (data.length > 10 ? 10 : data.length) + 47 + footerPad) / 16}rem`
      : "550px";

  // Columns with isHead:true → card header; rest → card body rows
  const headCols = useMemo(() => columns.filter((c) => c.isHead === true), [columns]);
  const bodyCols = useMemo(() => columns.filter((c) => c.isHead !== true), [columns]);

  // ─── Shared pagination buttons ────────────────────────────────────────────────

  const prevDisabled = loading || metaData?.currentPage === 1;
  const nextDisabled = loading || metaData?.endPage === metaData?.currentPage;
  const lastItem =
    metaData?.endPage === metaData?.currentPage
      ? (metaData?.totalRecords ?? 1)
      : (metaData?.endPage ?? 2) - 1;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <section
      className={`flex h-full flex-1 flex-col overflow-hidden ${
        shouldNotHaveBorder ? "" : "rounded-2xl border border-[#E4E7EC]"
      } ${className ?? ""}`}
    >
      {/* Search bar — responsive */}
      {searchProps && (
        <div className="relative mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4">
          <div className="relative h-fit w-full sm:w-fit">
            <input
              onChange={(e) => {
                searchProps.onChange(e.target.value);
                handleSearch();
              }}
              placeholder={searchProps.placeholder ?? "Searching for something?"}
              type="text"
              value={searchProps.value}
              className="w-full sm:w-[20rem] rounded-lg border border-[#D0D5DD] py-[0.625rem] pl-[2.4rem] pr-[.875rem] text-sm font-normal leading-4 text-[#667085] outline-none shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]"
            />
            <div className="absolute top-0 ml-[.875rem] flex h-full items-center justify-center">
              <Icon icon="hugeicons:search-01" className="w-4 h-4 text-[#667085]" />
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop table (lg+) ──────────────────────────────────────────────────── */}
      <div
        ref={container}
        className="hidden lg:block relative overflow-auto"
        style={{ height: containerHeight }}
      >
        <style jsx>{`
          div :global(table) { width: 100%; height: fit-content; }
          div :global(th:after) { bottom: -1px; width: 100%; left: 0; position: absolute; content: ""; border-bottom: 1px solid #f1f1f1 !important; }
          div :global(.last-row) { border-bottom: none !important; }
          div :global(thead) { background-color: #fff; position: sticky; z-index: 3; top: 0; height: fit-content; }
        `}</style>
        <table style={{ borderCollapse: "collapse", overflow: "auto", height: "fit-content" }}>
          <thead className="sticky top-0 z-[50] h-fit bg-white">
            <tr className="h-[46px] min-h-[46px] overflow-hidden">
              <th className={`${geistSans.className} px-6 py-2 text-left text-xs font-medium leading-4 text-[#475467]`}>
                {numberColName ?? "S/N"}
              </th>
              {columns.map((col) => (
                <th key={col.key} align="left" style={{ width: col.width }} className="px-6 py-2 text-xs font-medium leading-4 text-[#475467]">
                  {col.customTableHead ? col.customTableHead(col.header) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {loading ? (
              <tr className="h-fit w-full bg-white">
                <td colSpan={columns.length + 1} className="last-row" height="620px">
                  <div className="flex h-full w-full flex-col overflow-hidden">
                    {Array.from({ length: 10 }, (_, index) => (
                      <div key={`pulse__child__${index}`} className={`min-h-[6em] ${index % 2 === 0 ? "pulse bg-[#f5f5f9b8]" : "bg-[#fff]"}`} />
                    ))}
                  </div>
                </td>
              </tr>
            ) : !data.length ? (
              <tr className="h-fit w-full bg-white">
                <td colSpan={columns.length + 1} className="last-row mx-auto" height="500px">
                  <div className="mx-auto flex h-full max-w-[30.1875rem] flex-col items-center justify-center bg-transparent">
                    <Icon className="w-15 h-15" icon={emptyStateProps?.icon ?? "hugeicons:shopping-cart-02"} />
                    <h4 className="mb-3 text-center text-[1.75rem] font-medium leading-[2.125rem] text-black">{emptyStateProps?.title ?? "No Data"}</h4>
                    <p className="mb-6 text-center text-base font-normal leading-6">{emptyStateProps?.text ?? emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={keyExtractor(row)} style={{ backgroundColor: rowIndex % 2 ? "#FCFCFD" : "#fff" }}>
                  <td className={`${geistSans.className} h-24 px-6 py-2 text-sm font-medium leading-[18.9px] text-[#A7AEB1] ${rowIndex === data.length - 1 && isBottom ? "last-row" : ""}`}>
                    {pagination ? (metaData?.currentPage ?? 1) + rowIndex : rowIndex + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} style={{ width: col.width }} className={`h-24 px-6 py-4 text-sm font-normal leading-[120%] ${rowIndex === data.length - 1 && isBottom ? "last-row" : ""}`}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div ref={sentinelRef} style={{ height: "1px" }} aria-hidden />

        {pagination && (isBottom ? (
          <div className="sticky bottom-0 w-full flex flex-row items-center justify-between border-t border-[#EAECF0] bg-white px-4 py-3 rounded-b-lg">
            {loading ? (
              <div className="pulse h-[15px] w-[200px] rounded-[10px] bg-[#f5f5f9]" />
            ) : (
              <div className="text-sm font-semibold leading-[142.857%] text-[#202224] opacity-60">
                Showing {metaData?.currentPage ?? 1}–{lastItem} of {metaData?.totalRecords ?? 1}
              </div>
            )}
            <div className="flex items-center gap-[1.375rem]">
              <PagBtn disabled={prevDisabled} onClick={() => metaData?.onPageChange?.(Math.max(0, (metaData?.currentPage || 0) - 50 - 1) || 0)} icon="hugeicons:arrow-left-01" />
              <PagBtn disabled={nextDisabled} onClick={() => metaData?.onPageChange?.(metaData?.endPage || 1)} icon="hugeicons:arrow-right-01" />
            </div>
          </div>
        ) : (
          <div className="sticky flex justify-center" style={{ bottom: "12px" }}>
            <div className="flex items-center gap-3 rounded-lg border border-[#EAECF0] bg-[#FFFFFFEE] px-4 py-3">
              <PagBtn disabled={prevDisabled} onClick={() => metaData?.onPageChange?.(Math.max(0, (metaData?.currentPage || 0) - 50 - 1) || 0)} icon="hugeicons:arrow-left-01" />
              <span className="min-w-[4.5rem] text-center text-sm font-semibold text-[#344054] opacity-70 select-none">
                {metaData?.currentPage ?? 1}–{lastItem}
              </span>
              <PagBtn disabled={nextDisabled} onClick={() => metaData?.onPageChange?.(metaData?.endPage || 1)} icon="hugeicons:arrow-right-01" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Mobile / tablet card grid (below lg) ────────────────────────────────── */}
      <div className="lg:hidden flex-1 overflow-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-[.75rem] border border-[#E4E7EC] bg-white overflow-hidden animate-pulse">
                <div className="h-10 sm:h-11 bg-gray-100 border-b border-[#E4E7EC]" />
                {Array.from({ length: 5 }, (_, j) => (
                  <div key={j} className="flex justify-between items-center px-3 py-2.5 border-b last:border-0 border-[#E4E7EC] gap-3">
                    <div className="h-3 w-14 sm:w-16 bg-gray-200 rounded shrink-0" />
                    <div className="h-3 w-20 sm:w-24 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : !data.length ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mb-3" icon={emptyStateProps?.icon ?? "hugeicons:shopping-cart-02"} />
            <h4 className="mb-2 text-[1.125rem] sm:text-[1.375rem] font-medium text-black">{emptyStateProps?.title ?? "No Data"}</h4>
            <p className="text-[.8125rem] sm:text-sm text-gray-500">{emptyStateProps?.text ?? emptyMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {data.map((row, rowIndex) => {
              // First N-1 isHead cols → identifier (left); last isHead col → actions (right)
              const primaryHeads = headCols.length > 1 ? headCols.slice(0, -1) : headCols;
              const actionsCol = headCols.length > 1 ? headCols[headCols.length - 1] : null;
              const rowNum = pagination ? (metaData?.currentPage ?? 1) + rowIndex : rowIndex + 1;

              return (
                <div key={keyExtractor(row)} className="rounded-[.75rem] border border-[#E4E7EC] bg-white overflow-hidden">

                  {/* Card header */}
                  <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[#E4E7EC] bg-[#F9FAFB]">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 overflow-hidden">
                      <span className={`${geistSans.className} text-[.6875rem] sm:text-xs font-medium text-[#A7AEB1] shrink-0`}>
                        {rowNum}
                      </span>
                      {primaryHeads.map((col) => (
                        <span key={col.key} className="text-[.8125rem] sm:text-[.9375rem] font-[600] text-[#171717] truncate">
                          {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                        </span>
                      ))}
                    </div>
                    {actionsCol && (
                      <div className="shrink-0 flex items-center gap-1">
                        {actionsCol.render
                          ? actionsCol.render(row)
                          : String((row as Record<string, unknown>)[actionsCol.key] ?? "")}
                      </div>
                    )}
                  </div>

                  {/* Card body: label : value rows */}
                  {bodyCols.map((col) => {
                    const renderedValue = col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "");
                    return (
                      <div key={col.key} className="flex items-center justify-between gap-4 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[#E4E7EC] last:border-b-0">
                        <span className="text-[.6875rem] sm:text-xs font-normal text-[#667085] shrink-0">{col.header}</span>
                        <div className="text-[.75rem] sm:text-[.8125rem] font-[500] text-[#101828] text-right min-w-0">
                          {renderedValue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Card pagination */}
        {pagination && !loading && !!data.length && (
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-[.6875rem] sm:text-xs font-medium text-[#202224] opacity-60">
              Showing {metaData?.currentPage ?? 1}–{lastItem} of {metaData?.totalRecords ?? 1}
            </span>
            <div className="flex items-center gap-2">
              <PagBtn small disabled={prevDisabled} onClick={() => metaData?.onPageChange?.(Math.max(0, (metaData?.currentPage || 0) - 50 - 1) || 0)} icon="hugeicons:arrow-left-01" />
              <PagBtn small disabled={nextDisabled} onClick={() => metaData?.onPageChange?.(metaData?.endPage || 1)} icon="hugeicons:arrow-right-01" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const Table = memo(DataTable) as typeof DataTable;

export { DataTable, Table };
