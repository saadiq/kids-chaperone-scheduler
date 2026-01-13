"use client";

import { ReactNode } from "react";
import { AssignmentStatus, DateFilterOption, Adult } from "@/lib/types";

type StatusFilter = "all" | AssignmentStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string; shortLabel: string }[] = [
  { value: "all", label: "All", shortLabel: "All" },
  { value: "needs-assignment", label: "Needs Assignment", shortLabel: "Unassigned" },
  { value: "awaiting-response", label: "Pending", shortLabel: "Pending" },
  { value: "confirmed", label: "Confirmed", shortLabel: "Confirmed" },
];

const DATE_FILTER_OPTIONS: { value: DateFilterOption; label: string }[] = [
  { value: "this-week", label: "This Week" },
  { value: "next-week", label: "Next Week" },
  { value: "this-month", label: "This Month" },
  { value: "7-days", label: "7 Days" },
  { value: "14-days", label: "14 Days" },
  { value: "21-days", label: "21 Days" },
];

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  shortLabel?: string;
  count: number;
}

function FilterButton({ active, onClick, label, shortLabel, count }: FilterButtonProps): ReactNode {
  return (
    <button
      onClick={onClick}
      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors duration-200 whitespace-nowrap flex-shrink-0 ${
        active
          ? "bg-orange-500 text-white shadow-sm"
          : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-300"
      }`}
    >
      <span className="sm:hidden">{shortLabel || label}</span>
      <span className="hidden sm:inline">{label}</span>
      <span className="ml-1 text-xs opacity-75">({count})</span>
    </button>
  );
}

interface StatusFilterRowProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  statusCounts: Record<StatusFilter, number>;
}

export function StatusFilterRow({
  statusFilter,
  onStatusFilterChange,
  statusCounts,
}: StatusFilterRowProps): ReactNode {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap">
      {STATUS_OPTIONS.map((opt) => (
        <FilterButton
          key={opt.value}
          active={statusFilter === opt.value}
          onClick={() => onStatusFilterChange(opt.value)}
          label={opt.label}
          shortLabel={opt.shortLabel}
          count={statusCounts[opt.value]}
        />
      ))}
    </div>
  );
}

interface DateFilterRowProps {
  dateFilter: DateFilterOption;
  onDateFilterChange: (filter: DateFilterOption) => void;
  dateCounts: Record<DateFilterOption, number>;
}

export function DateFilterRow({
  dateFilter,
  onDateFilterChange,
  dateCounts,
}: DateFilterRowProps): ReactNode {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap">
      {DATE_FILTER_OPTIONS.map((opt) => (
        <FilterButton
          key={opt.value}
          active={dateFilter === opt.value}
          onClick={() => onDateFilterChange(opt.value)}
          label={opt.label}
          count={dateCounts[opt.value]}
        />
      ))}
    </div>
  );
}

interface SearchAndAssigneeFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (assignee: string) => void;
  adults: Adult[];
}

export function SearchAndAssigneeFilter({
  searchQuery,
  onSearchChange,
  assigneeFilter,
  onAssigneeFilterChange,
  adults,
}: SearchAndAssigneeFilterProps): ReactNode {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 sm:items-center">
      <input
        type="text"
        placeholder="Search events..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="px-3 py-2 sm:py-1.5 text-sm border border-stone-300 rounded-lg bg-white w-full sm:flex-1 sm:min-w-48 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 focus:outline-none focus:border-orange-500 placeholder:text-stone-500 transition-all duration-200"
      />
      <select
        value={assigneeFilter}
        onChange={(e) => onAssigneeFilterChange(e.target.value)}
        className="px-3 py-2 sm:py-1.5 text-sm border border-stone-300 rounded-lg bg-white text-stone-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 focus:outline-none focus:border-orange-500 transition-all duration-200"
      >
        <option value="all">All assignees</option>
        <option value="unassigned">Unassigned</option>
        {adults.map((adult) => (
          <option key={adult.email} value={adult.email}>
            {adult.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export { STATUS_OPTIONS, DATE_FILTER_OPTIONS };
export type { StatusFilter };
