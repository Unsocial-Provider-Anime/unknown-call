CREATE OR REPLACE FUNCTION public.get_country_code_distribution()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    WITH country_calls AS (
        SELECT
            COALESCE(NULLIF(BTRIM(country_code), ''), 'Unknown') AS country_code,
            COUNT(*) AS call_count
        FROM public.call_records
        GROUP BY COALESCE(NULLIF(BTRIM(country_code), ''), 'Unknown')
    ), caller_counts AS (
        SELECT
            COALESCE(NULLIF(BTRIM(country_code), ''), 'Unknown') AS country_code,
            BTRIM(caller_number) AS caller_number,
            COUNT(*) AS call_count
        FROM public.call_records
        WHERE BTRIM(caller_number) <> ''
        GROUP BY
            COALESCE(NULLIF(BTRIM(country_code), ''), 'Unknown'),
            BTRIM(caller_number)
    ), caller_summary AS (
        SELECT
            country_code,
            COUNT(*) AS distinct_callers,
            COUNT(*) FILTER (WHERE call_count = 1) AS one_time_callers,
            COUNT(*) FILTER (WHERE call_count >= 2) AS repeat_callers,
            SUM(call_count) AS caller_calls
        FROM caller_counts
        GROUP BY country_code
    ), totals AS (
        SELECT COALESCE(SUM(call_count), 0) AS total_calls
        FROM country_calls
    )
    SELECT jsonb_build_object(
        'summary', jsonb_build_object(
            'total_calls', totals.total_calls,
            'distinct_country_codes', (SELECT COUNT(*) FROM country_calls)
        ),
        'countries', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'country_code', country_calls.country_code,
                    'call_count', country_calls.call_count,
                    'call_share', country_calls.call_count::NUMERIC
                        / NULLIF(totals.total_calls, 0),
                    'distinct_callers', COALESCE(caller_summary.distinct_callers, 0),
                    'one_time_callers', COALESCE(caller_summary.one_time_callers, 0),
                    'repeat_callers', COALESCE(caller_summary.repeat_callers, 0),
                    'calls_per_caller', COALESCE(
                        caller_summary.caller_calls::NUMERIC
                            / NULLIF(caller_summary.distinct_callers, 0),
                        0
                    )
                )
                ORDER BY country_calls.call_count DESC,
                    country_calls.country_code COLLATE "C"
            )
            FROM country_calls
            LEFT JOIN caller_summary USING (country_code)
            CROSS JOIN totals
        ), '[]'::JSONB)
    )
    FROM totals;
$$;

GRANT EXECUTE ON FUNCTION public.get_country_code_distribution()
    TO anon, authenticated, service_role;
