CREATE OR REPLACE FUNCTION public.get_caller_frequency_distribution()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    WITH caller_counts AS (
        SELECT country_code, caller_number, COUNT(*) AS call_count
        FROM public.call_records
        WHERE BTRIM(caller_number) <> ''
        GROUP BY country_code, caller_number
    ), frequencies AS (
        SELECT call_count AS calls_per_caller, COUNT(*) AS caller_count
        FROM caller_counts
        GROUP BY call_count
    ), top_callers AS (
        SELECT country_code, caller_number, call_count
        FROM caller_counts
        ORDER BY call_count DESC, country_code COLLATE "C", caller_number COLLATE "C"
        LIMIT 10
    )
    SELECT jsonb_build_object(
        'summary', (
            SELECT jsonb_build_object(
                'total_calls', COALESCE(SUM(call_count), 0),
                'distinct_callers', COUNT(*),
                'one_time_callers', COUNT(*) FILTER (WHERE call_count = 1),
                'repeat_callers', COUNT(*) FILTER (WHERE call_count >= 2)
            )
            FROM caller_counts
        ),
        'distribution', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'calls_per_caller', calls_per_caller,
                    'caller_count', caller_count
                ) ORDER BY calls_per_caller
            )
            FROM frequencies
        ), '[]'::JSONB),
        'top_callers', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'country_code', country_code,
                    'caller_number', caller_number,
                    'call_count', call_count
                ) ORDER BY call_count DESC, country_code COLLATE "C", caller_number COLLATE "C"
            )
            FROM top_callers
        ), '[]'::JSONB)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_caller_frequency_distribution()
    TO anon, authenticated, service_role;