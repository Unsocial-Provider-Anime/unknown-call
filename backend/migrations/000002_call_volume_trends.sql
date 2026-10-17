CREATE OR REPLACE FUNCTION public.get_call_volume(p_period TEXT)
RETURNS TABLE(bucket_start DATE, call_count BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF p_period NOT IN ('day', 'week', 'month', 'year') THEN
        RAISE EXCEPTION 'Unsupported call volume period: %', p_period
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    WITH bounds AS (
        SELECT
            MIN(date_trunc(p_period, date::TIMESTAMP)::DATE) AS first_bucket,
            MAX(date_trunc(p_period, date::TIMESTAMP)::DATE) AS last_bucket
        FROM public.call_records
    ), buckets AS (
        SELECT generated.bucket::DATE AS bucket_start
        FROM bounds
        CROSS JOIN LATERAL generate_series(
            bounds.first_bucket::TIMESTAMP,
            bounds.last_bucket::TIMESTAMP,
            CASE p_period
                WHEN 'day' THEN INTERVAL '1 day'
                WHEN 'week' THEN INTERVAL '1 week'
                WHEN 'month' THEN INTERVAL '1 month'
                WHEN 'year' THEN INTERVAL '1 year'
            END
        ) AS generated(bucket)
    )
    SELECT
        buckets.bucket_start,
        COUNT(call_records.id)::BIGINT AS call_count
    FROM buckets
    LEFT JOIN public.call_records
        ON date_trunc(p_period, call_records.date::TIMESTAMP)::DATE = buckets.bucket_start
    GROUP BY buckets.bucket_start
    ORDER BY buckets.bucket_start;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_call_volume(TEXT)
    TO anon, authenticated, service_role;