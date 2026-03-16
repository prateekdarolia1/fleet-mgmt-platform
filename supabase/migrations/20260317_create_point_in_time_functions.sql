-- Historical Data Management System - Point-in-Time Query Functions
-- Enables querying entity states at any historical date

-- ============================================================================
-- 1. GET_ENTITY_STATE_AT_DATE
-- Returns the state of an entity at a specific point in time
-- ============================================================================

CREATE OR REPLACE FUNCTION get_entity_state_at_date(
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_result JSONB;
BEGIN
    CASE p_entity_type
        WHEN 'rider' THEN
            SELECT jsonb_build_object(
                'entity_type', 'rider',
                'entity_id', r.rider_id,
                'status', r.status,
                'duty_status', r.duty_status,
                'vehicle_assigned', r.vehicle_assigned,
                'onboard_date', r.onboard_date,
                'deboard_date', r.deboard_date,
                'effective_start_date', r.effective_start_date,
                'effective_end_date', r.effective_end_date,
                'confidence_score', r.confidence_score,
                'data_source', r.data_source,
                'is_historical_import', r.is_historical_import
            ) INTO v_result
            FROM riders r
            WHERE r.rider_id = p_entity_id
              AND r.effective_start_date <= p_date
              AND (r.effective_end_date IS NULL OR r.effective_end_date > p_date);

        WHEN 'vehicle' THEN
            SELECT jsonb_build_object(
                'entity_type', 'vehicle',
                'entity_id', v.vehicle_number,
                'status', v.status,
                'rider_id', v.rider_id,
                'make', v.make,
                'model', v.model,
                'effective_start_date', v.effective_start_date,
                'effective_end_date', v.effective_end_date,
                'confidence_score', v.confidence_score,
                'data_source', v.data_source,
                'is_historical_import', v.is_historical_import
            ) INTO v_result
            FROM vehicles v
            WHERE v.vehicle_number = p_entity_id
              AND v.effective_start_date <= p_date
              AND (v.effective_end_date IS NULL OR v.effective_end_date > p_date);

        WHEN 'battery' THEN
            SELECT jsonb_build_object(
                'entity_type', 'battery',
                'entity_id', b.battery_id,
                'status', b.status,
                'vehicle_id', b.vehicle_id,
                'service_provider', b.service_provider,
                'effective_start_date', b.effective_start_date,
                'effective_end_date', b.effective_end_date,
                'confidence_score', b.confidence_score,
                'data_source', b.data_source,
                'is_historical_import', b.is_historical_import
            ) INTO v_result
            FROM batteries b
            WHERE b.battery_id = p_entity_id
              AND b.effective_start_date <= p_date
              AND (b.effective_end_date IS NULL OR b.effective_end_date > p_date);

        WHEN 'payment' THEN
            SELECT jsonb_build_object(
                'entity_type', 'payment',
                'entity_id', p.payment_id,
                'rider_id', p.rider_id,
                'amount', p.amount,
                'status', p.status,
                'due_date', p.due_date,
                'payment_date', p.payment_date,
                'effective_start_date', p.effective_start_date,
                'effective_end_date', p.effective_end_date,
                'confidence_score', p.confidence_score,
                'data_source', p.data_source,
                'is_historical_import', p.is_historical_import
            ) INTO v_result
            FROM payments p
            WHERE p.payment_id::TEXT = p_entity_id
              AND p.effective_start_date <= p_date
              AND (p.effective_end_date IS NULL OR p.effective_end_date > p_date);

        ELSE
            v_result := jsonb_build_object('error', 'Unknown entity type: ' || p_entity_type);
    END CASE;

    IF v_result IS NULL THEN
        v_result := jsonb_build_object(
            'error', 'Entity not active at specified date',
            'entity_type', p_entity_type,
            'entity_id', p_entity_id,
            'queried_date', p_date
        );
    END IF;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_entity_state_at_date(TEXT, TEXT, DATE) IS
'Retrieves the state of an entity (rider, vehicle, battery, payment) at a specific point in time';

-- ============================================================================
-- 2. GET_ACTIVE_RIDERS_COUNT_AT_DATE
-- Returns count of active riders at a specific date
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_riders_count_at_date(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_count INT;
    v_avg_confidence DECIMAL(3,2);
BEGIN
    SELECT
        COUNT(*),
        COALESCE(AVG(confidence_score), 1.00)::DECIMAL(3,2)
    INTO v_count, v_avg_confidence
    FROM riders
    WHERE status = 'active'
      AND effective_start_date <= p_date
      AND (effective_end_date IS NULL OR effective_end_date > p_date);

    RETURN jsonb_build_object(
        'date', p_date,
        'active_riders_count', v_count,
        'avg_confidence_score', v_avg_confidence,
        'data_quality', CASE
            WHEN v_avg_confidence >= 0.90 THEN 'high'
            WHEN v_avg_confidence >= 0.70 THEN 'moderate'
            ELSE 'low'
        END
    );
END;
$$;

COMMENT ON FUNCTION get_active_riders_count_at_date(DATE) IS
'Returns the count of active riders at a specific point in time with data quality indicator';

-- ============================================================================
-- 3. GET_DEPLOYED_VEHICLES_COUNT_AT_DATE
-- Returns count of deployed vehicles at a specific date
-- ============================================================================

CREATE OR REPLACE FUNCTION get_deployed_vehicles_count_at_date(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_count INT;
    v_with_rider INT;
    v_avg_confidence DECIMAL(3,2);
BEGIN
    SELECT
        COUNT(*),
        COUNT(CASE WHEN rider_id IS NOT NULL THEN 1 END),
        COALESCE(AVG(confidence_score), 1.00)::DECIMAL(3,2)
    INTO v_count, v_with_rider, v_avg_confidence
    FROM vehicles
    WHERE status = 'Deployed'
      AND effective_start_date <= p_date
      AND (effective_end_date IS NULL OR effective_end_date > p_date);

    RETURN jsonb_build_object(
        'date', p_date,
        'deployed_vehicles_count', v_count,
        'vehicles_with_rider', v_with_rider,
        'vehicles_without_rider', v_count - v_with_rider,
        'avg_confidence_score', v_avg_confidence,
        'data_quality', CASE
            WHEN v_avg_confidence >= 0.90 THEN 'high'
            WHEN v_avg_confidence >= 0.70 THEN 'moderate'
            ELSE 'low'
        END
    );
END;
$$;

COMMENT ON FUNCTION get_deployed_vehicles_count_at_date(DATE) IS
'Returns the count of deployed vehicles at a specific point in time with assignment breakdown';

-- ============================================================================
-- 4. GET_REVENUE_BY_PERIOD
-- Returns revenue aggregated by time period with confidence indicators
-- ============================================================================

CREATE OR REPLACE FUNCTION get_revenue_by_period(
    p_start_date DATE,
    p_end_date DATE,
    p_period TEXT DEFAULT 'month'  -- 'day', 'week', 'month', 'year'
)
RETURNS TABLE (
    period_start DATE,
    period_end DATE,
    total_revenue DECIMAL(12,2),
    payment_count BIGINT,
    avg_confidence_score DECIMAL(3,2),
    data_quality TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE_TRUNC(p_period, payment_date)::DATE AS period_start,
        (DATE_TRUNC(p_period, payment_date) + INTERVAL '1 ' || p_period)::DATE AS period_end,
        COALESCE(SUM(amount), 0)::DECIMAL(12,2) AS total_revenue,
        COUNT(*) AS payment_count,
        COALESCE(AVG(confidence_score), 1.00)::DECIMAL(3,2) AS avg_confidence_score,
        CASE
            WHEN COALESCE(AVG(confidence_score), 1.00) >= 0.90 THEN 'high'
            WHEN COALESCE(AVG(confidence_score), 1.00) >= 0.70 THEN 'moderate'
            ELSE 'low'
        END AS data_quality
    FROM payments
    WHERE payment_date >= p_start_date
      AND payment_date < p_end_date
      AND status = 'completed'
    GROUP BY DATE_TRUNC(p_period, payment_date)
    ORDER BY DATE_TRUNC(p_period, payment_date);
END;
$$;

COMMENT ON FUNCTION get_revenue_by_period(DATE, DATE, TEXT) IS
'Returns revenue aggregated by time period (day/week/month/year) with confidence scores';

-- ============================================================================
-- 5. GET_ENTITY_TIMELINE
-- Returns chronological timeline of all events for an entity
-- ============================================================================

CREATE OR REPLACE FUNCTION get_entity_timeline(
    p_entity_type TEXT,
    p_entity_id TEXT
)
RETURNS TABLE (
    event_date TIMESTAMPTZ,
    event_type TEXT,
    event_source TEXT,
    event_data JSONB,
    confidence DECIMAL(3,2),
    is_historical BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- Return events from rider_events, vehicle_events, battery_events tables
    -- Plus retroactive_events for historical imports
    RETURN QUERY

    -- From rider_events
    SELECT
        re.created_at AS event_date,
        re.event_type::TEXT,
        COALESCE(re.data_source, 'PLATFORM')::TEXT AS event_source,
        jsonb_build_object(
            'previous_status', re.previous_status,
            'new_status', re.new_status,
            'previous_vehicle', re.previous_vehicle,
            'new_vehicle', re.new_vehicle
        ) AS event_data,
        1.00::DECIMAL(3,2) AS confidence,
        FALSE AS is_historical
    FROM rider_events re
    WHERE p_entity_type = 'rider' AND re.rider_id = p_entity_id

    UNION ALL

    -- From vehicle_events
    SELECT
        ve.created_at AS event_date,
        ve.event_type::TEXT,
        COALESCE(ve.data_source, 'PLATFORM')::TEXT AS event_source,
        jsonb_build_object(
            'previous_status', ve.previous_status,
            'new_status', ve.new_status,
            'previous_rider', ve.previous_rider,
            'new_rider', ve.new_rider
        ) AS event_data,
        1.00::DECIMAL(3,2) AS confidence,
        FALSE AS is_historical
    FROM vehicle_events ve
    WHERE p_entity_type = 'vehicle' AND ve.vehicle_number = p_entity_id

    UNION ALL

    -- From battery_events
    SELECT
        be.created_at AS event_date,
        be.event_type::TEXT,
        COALESCE(be.data_source, 'PLATFORM')::TEXT AS event_source,
        jsonb_build_object(
            'previous_status', be.previous_status,
            'new_status', be.new_status,
            'previous_vehicle', be.previous_vehicle,
            'new_vehicle', be.new_vehicle
        ) AS event_data,
        1.00::DECIMAL(3,2) AS confidence,
        FALSE AS is_historical
    FROM battery_events be
    WHERE p_entity_type = 'battery' AND be.battery_id = p_entity_id

    UNION ALL

    -- From retroactive_events (historical imports)
    SELECT
        ra.effective_date AS event_date,
        ra.event_type::TEXT,
        ra.source::TEXT AS event_source,
        ra.event_data AS event_data,
        ra.confidence::DECIMAL(3,2) AS confidence,
        TRUE AS is_historical
    FROM retroactive_events ra
    WHERE ra.entity_type = p_entity_type
      AND ra.entity_id = p_entity_id

    ORDER BY event_date ASC;
END;
$$;

COMMENT ON FUNCTION get_entity_timeline(TEXT, TEXT) IS
'Returns complete timeline of events for an entity, including retroactive events from historical imports';

-- ============================================================================
-- 6. GET_IMPORT_BATCH_SUMMARY
-- Returns summary statistics for an import batch
-- ============================================================================

CREATE OR REPLACE FUNCTION get_import_batch_summary(p_batch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_batch RECORD;
    v_riders_created INT;
    v_vehicles_created INT;
    v_batteries_created INT;
    v_payments_created INT;
    v_events_created INT;
BEGIN
    -- Get batch info
    SELECT * INTO v_batch FROM data_import_batches WHERE id = p_batch_id;

    IF v_batch IS NULL THEN
        RETURN jsonb_build_object('error', 'Batch not found', 'batch_id', p_batch_id);
    END IF;

    -- Count created records by type
    SELECT COUNT(*) INTO v_riders_created
    FROM riders WHERE import_batch_id = p_batch_id AND is_historical_import = TRUE;

    SELECT COUNT(*) INTO v_vehicles_created
    FROM vehicles WHERE import_batch_id = p_batch_id AND is_historical_import = TRUE;

    SELECT COUNT(*) INTO v_batteries_created
    FROM batteries WHERE import_batch_id = p_batch_id AND is_historical_import = TRUE;

    SELECT COUNT(*) INTO v_payments_created
    FROM payments WHERE import_batch_id = p_batch_id AND is_historical_import = TRUE;

    SELECT COUNT(*) INTO v_events_created
    FROM retroactive_events WHERE import_batch_id = p_batch_id;

    RETURN jsonb_build_object(
        'batch_id', p_batch_id,
        'batch_name', v_batch.batch_name,
        'source_file', v_batch.source_file,
        'import_date', v_batch.import_date,
        'data_period', jsonb_build_object(
            'start', v_batch.data_period_start,
            'end', v_batch.data_period_end
        ),
        'status', v_batch.status,
        'records', jsonb_build_object(
            'total', v_batch.records_total,
            'created', v_batch.records_created,
            'updated', v_batch.records_updated,
            'skipped', v_batch.records_skipped
        ),
        'by_entity_type', jsonb_build_object(
            'riders_created', v_riders_created,
            'vehicles_created', v_vehicles_created,
            'batteries_created', v_batteries_created,
            'payments_created', v_payments_created
        ),
        'retroactive_events_created', v_events_created,
        'defaults_applied', v_batch.defaults_applied,
        'warnings', v_batch.warnings
    );
END;
$$;

COMMENT ON FUNCTION get_import_batch_summary(UUID) IS
'Returns detailed summary of an import batch including record counts by entity type';
