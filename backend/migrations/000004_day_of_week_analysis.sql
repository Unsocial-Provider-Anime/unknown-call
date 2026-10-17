CREATE OR REPLACE FUNCTION public.get_call_day_of_week_analysis()
RETURNS TABLE(iso_day INTEGER, call_count BIGINT, observed_days BIGINT)
LANGUAGE sql
STABLE
AS $$
    WITH bounds AS (
        SELECT MIN(date) AS first_date, MAX(date) AS last_date
        FROM public.call_records
    ), calendar AS (
        SELECT generated.day::DATE AS call_date
        FROM bounds
        CROSS JOIN LATERAL generate_series(
            bounds.first_date::TIMESTAMP,
            bounds.last_date::TIMESTAMP,
            INTERVAL '1 day'
        ) AS generated(day)
    ), daily_counts AS (
        SELECT
            EXTRACT(ISODOW FROM calendar.call_date)::INTEGER AS iso_day,
            COUNT(call_records.id)::BIGINT AS call_count,
            COUNT(calendar.call_date)::BIGINT AS observed_days
        FROM calendar
        LEFT JOIN public.call_records
            ON call_records.date = calendar.call_date
        GROUP BY EXTRACT(ISODOW FROM calendar.call_date)::INTEGER
    )
    SELECT
        weekdays.iso_day,
        COALESCE(daily_counts.call_count, 0)::BIGINT AS call_count,
        COALESCE(daily_counts.observed_days, 0)::BIGINT AS observed_days
    FROM generate_series(1, 7) AS weekdays(iso_day)
    LEFT JOIN daily_counts USING (iso_day)
    ORDER BY weekdays.iso_day;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_day_of_week_analysis()
    TO anon, authenticated, service_role;