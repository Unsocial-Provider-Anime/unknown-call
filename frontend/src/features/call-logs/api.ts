import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { fetchJson } from "../../shared/api/fetchJson";

export const callLogSchema = z.object({
  id: z.number(),
  date: z.string(),
  time: z.string(),
  country_code: z.string(),
  caller_number: z.string(),
});

export const callLogsResponseSchema = z.object({
  call_logs: z.array(callLogSchema),
});

export const callLogSearchSchema = z.object({
  search: z.string().catch(""),
  countryCode: z.string().catch("all"),
  dateFrom: z.union([z.literal(""), z.iso.date()]).catch(""),
  dateTo: z.union([z.literal(""), z.iso.date()]).catch(""),
});

export type CallLog = z.infer<typeof callLogSchema>;
export type CallLogsResponse = z.infer<typeof callLogsResponseSchema>;
export type CallLogSearch = z.infer<typeof callLogSearchSchema>;

export const defaultCallLogSearch = {
  search: "",
  countryCode: "all",
  dateFrom: "",
  dateTo: "",
} satisfies CallLogSearch;

export const callLogsKeys = {
  list: () => ["call_logs"] as const,
};

export const callLogsQueryOptions = () =>
  queryOptions({
    queryKey: callLogsKeys.list(),
    queryFn: ({ signal }) =>
      fetchJson("/api/calls/list", callLogsResponseSchema, signal),
  });