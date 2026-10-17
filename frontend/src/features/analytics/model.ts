import type { DayOfWeekResponse, HourlyDistributionResponse } from "./api";

export function getPeakHours(points: HourlyDistributionResponse["points"]) {
  const peakCount = Math.max(0, ...points.map((point) => point.count));
  const hours = points
    .filter((point) => peakCount > 0 && point.count === peakCount)
    .map((point) => point.hour);

  return { peakCount, hours };
}

export function hasObservedDayOfWeekData(data: DayOfWeekResponse): boolean {
  return data.weekday.observed_days + data.weekend.observed_days > 0;
}