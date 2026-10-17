CREATE OR REPLACE FUNCTION public.get_call_hourly_distribution()
RETURNS TABLE(hour INTEGER, call_count BIGINT)
LANGUAGE sql
STABLE
AS $$
    SELECT
        hours.hour,
        COALESCE(hourly_counts.call_count, 0)::BIGINT AS call_count
    FROM generate_series(0, 23) AS hours(hour)
    LEFT JOIN (
        SELECT
            EXTRACT(HOUR FROM time)::INTEGER AS hour,
            COUNT(*)::BIGINT AS call_count
        FROM public.call_records
        GROUP BY EXTRACT(HOUR FROM time)::INTEGER
    ) AS hourly_counts
        ON hourly_counts.hour = hours.hour
    ORDER BY hours.hour;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_hourly_distribution()
    TO anon, authenticated, service_role;