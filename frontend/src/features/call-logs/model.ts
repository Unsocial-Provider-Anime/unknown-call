import type { CallLog, CallLogSearch } from "./api";

export function filterCallLogs(
  callLogs: CallLog[],
  filters: CallLogSearch,
): CallLog[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return callLogs.filter((log) => {
    const searchableText =
      `${log.date} ${log.time} ${log.country_code} ${log.caller_number}`.toLowerCase();

    return (
      (!normalizedSearch || searchableText.includes(normalizedSearch)) &&
      (filters.countryCode === "all" ||
        log.country_code === filters.countryCode) &&
      (!filters.dateFrom || log.date >= filters.dateFrom) &&
      (!filters.dateTo || log.date <= filters.dateTo)
    );
  });
}

export function hasCallLogFilters(filters: CallLogSearch): boolean {
  return Boolean(
    filters.search.trim() ||
      filters.countryCode !== "all" ||
      filters.dateFrom ||
      filters.dateTo,
  );
}