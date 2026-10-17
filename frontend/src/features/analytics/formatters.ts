import dayjs from "dayjs";
import type { VolumePeriod } from "./api";

export function formatBucketDate(value: Date, period: VolumePeriod): string {
  const date = dayjs(value);
  if (period === "year") {
    return date.format("YYYY");
  }
  if (period === "month") {
    return date.format("MMM YYYY");
  }
  return date.format("MMM D, YYYY");
}

export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function formatRate(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatPValue(value: number): string {
  return value < 0.001 ? "< 0.001" : value.toFixed(3);
}