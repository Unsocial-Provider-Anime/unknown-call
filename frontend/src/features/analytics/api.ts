import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { fetchJson } from "../../shared/api/fetchJson";

export const volumePeriods = ["day", "week", "month", "year"] as const;
export const volumePeriodSchema = z.enum(volumePeriods);

export const volumeResponseSchema = z.object({
  period: volumePeriodSchema,
  points: z.array(
    z.object({
      date: z.iso.date(),
      count: z.number().int().nonnegative(),
    }),
  ),
});

const hourlyDistributionResponseSchema = z.object({
  points: z.array(
    z.object({
      hour: z.number().int().min(0).max(23),
      count: z.number().int().nonnegative(),
    }),
  ),
});

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const dayGroupSchema = z.object({
  call_count: z.number().int().nonnegative(),
  observed_days: z.number().int().nonnegative(),
  calls_per_day: z.number().nonnegative(),
});

const dayOfWeekResponseSchema = z.object({
  days: z.array(
    z.object({
      day: z.enum(dayNames),
      call_count: z.number().int().nonnegative(),
      observed_days: z.number().int().nonnegative(),
      calls_per_day: z.number().nonnegative(),
    }),
  ),
  weekday: dayGroupSchema,
  weekend: dayGroupSchema,
  rate_ratio: z.number().nonnegative().nullable(),
  confidence_interval_95: z
    .object({
      lower: z.number().nonnegative(),
      upper: z.number().nonnegative().nullable(),
    })
    .nullable(),
  p_value: z.number().min(0).max(1).nullable(),
  test_available: z.boolean(),
  test_unavailable_reason: z.string().nullable(),
});

export type VolumePeriod = z.infer<typeof volumePeriodSchema>;
export type VolumeResponse = z.infer<typeof volumeResponseSchema>;
export type HourlyDistributionResponse = z.infer<
  typeof hourlyDistributionResponseSchema
>;
export type DayOfWeekResponse = z.infer<typeof dayOfWeekResponseSchema>;

export const callerFrequencyResponseSchema = z.object({
  summary: z.object({
    total_calls: z.number().int().nonnegative(),
    distinct_callers: z.number().int().nonnegative(),
    one_time_callers: z.number().int().nonnegative(),
    repeat_callers: z.number().int().nonnegative(),
  }),
  distribution: z.array(
    z.object({
      calls_per_caller: z.number().int().positive(),
      caller_count: z.number().int().positive(),
    }),
  ),
  top_callers: z
    .array(
      z.object({
        country_code: z.string(),
        caller_number: z.string(),
        call_count: z.number().int().positive(),
      }),
    )
    .max(10),
});

export type CallerFrequencyResponse = z.infer<
  typeof callerFrequencyResponseSchema
>;

export const analyticsKeys = {
  volume: (period: VolumePeriod) => ["call-volume", period] as const,
  hourly: () => ["hourly-call-distribution"] as const,
  dayOfWeek: () => ["call-day-of-week-analysis"] as const,
  callerFrequency: () => ["caller-frequency-distribution"] as const,
};

export const analyticsQueries = {
  volume: (period: VolumePeriod) =>
    queryOptions({
      queryKey: analyticsKeys.volume(period),
      queryFn: ({ signal }) =>
        fetchJson(
          `/api/calls/volume?period=${period}`,
          volumeResponseSchema,
          signal,
        ),
    }),
  hourly: () =>
    queryOptions({
      queryKey: analyticsKeys.hourly(),
      queryFn: ({ signal }) =>
        fetchJson(
          "/api/calls/hourly",
          hourlyDistributionResponseSchema,
          signal,
        ),
    }),
  dayOfWeek: () =>
    queryOptions({
      queryKey: analyticsKeys.dayOfWeek(),
      queryFn: ({ signal }) =>
        fetchJson("/api/calls/day-of-week", dayOfWeekResponseSchema, signal),
    }),
  callerFrequency: () =>
    queryOptions({
      queryKey: analyticsKeys.callerFrequency(),
      queryFn: ({ signal }) =>
        fetchJson(
          "/api/calls/caller-frequency",
          callerFrequencyResponseSchema,
          signal,
        ),
    }),
};
