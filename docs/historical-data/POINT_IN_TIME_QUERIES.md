# Point-in-Time Queries Guide

## Overview

Point-in-time queries allow you to retrieve the state of entities (riders, vehicles, batteries, payments) at any historical date. This is essential for:
- Historical reporting and analytics
- Reconstructing past fleet states
- Auditing and compliance
- Data validation and verification

## Core Concepts

### Effective Dates

Every historical record has:
- `effective_start_date`: When this entity state became effective
- `effective_end_date`: When this state ended (NULL = current)

### Query Logic

```sql
SELECT * FROM riders
WHERE effective_start_date <= :query_date
  AND (effective_end_date IS NULL OR effective_end_date > :query_date)
```

## SQL Functions

### get_entity_state_at_date

Retrieves entity state at a specific point in time.

```sql
SELECT * FROM get_entity_state_at_date(
  'rider',      -- entity_type: 'rider', 'vehicle', 'battery', 'payment'
  'DR001',      -- entity_id
  '2024-06-15'  -- date
);
```

**Returns:**
```json
{
  "entity_type": "rider",
  "entity_id": "DR001",
  "status": "active",
  "vehicle_assigned": "VH001",
  "effective_start_date": "2024-01-15",
  "effective_end_date": null,
  "confidence_score": 0.95,
  "data_source": "CL87_CSV"
}
```

### get_active_riders_count_at_date

Returns count of active riders at a specific date.

```sql
SELECT * FROM get_active_riders_count_at_date('2024-06-15');
```

**Returns:**
```json
{
  "date": "2024-06-15",
  "active_riders_count": 42,
  "avg_confidence_score": 0.87,
  "data_quality": "high"
}
```

### get_deployed_vehicles_count_at_date

Returns count of deployed vehicles at a specific date.

```sql
SELECT * FROM get_deployed_vehicles_count_at_date('2024-06-15');
```

**Returns:**
```json
{
  "date": "2024-06-15",
  "deployed_vehicles_count": 35,
  "vehicles_with_rider": 30,
  "vehicles_without_rider": 5,
  "avg_confidence_score": 0.90,
  "data_quality": "high"
}
```

### get_revenue_by_period

Returns revenue aggregated by time period.

```sql
SELECT * FROM get_revenue_by_period(
  '2024-01-01',  -- start_date
  '2024-12-31',  -- end_date
  'month'        -- period: 'day', 'week', 'month', 'year'
);
```

**Returns:**
```json
[
  {
    "period_start": "2024-01-01",
    "period_end": "2024-02-01",
    "total_revenue": 150000,
    "payment_count": 100,
    "avg_confidence_score": 0.95,
    "data_quality": "high"
  }
]
```

### get_entity_timeline

Returns complete timeline of events for an entity.

```sql
SELECT * FROM get_entity_timeline(
  'rider',  -- entity_type
  'DR001'   -- entity_id
);
```

**Returns:**
```json
[
  {
    "event_date": "2024-01-10T00:00:00Z",
    "event_type": "ONBOARD",
    "event_source": "CL87_CSV",
    "event_data": {"vehicle_assigned": "VH001"},
    "confidence": 0.90,
    "is_historical": true
  },
  {
    "event_date": "2024-06-15T00:00:00Z",
    "event_type": "VEHICLE_CHANGE",
    "event_source": "PLATFORM",
    "event_data": {"old_vehicle": "VH001", "new_vehicle": "VH002"},
    "confidence": 1.00,
    "is_historical": false
  }
]
```

## React Query Hooks

### useEntityStateAtDate

```typescript
import { useEntityStateAtDate } from '@/hooks/usePointInTimeQueries';

function RiderHistory({ riderId, date }) {
  const { data, isLoading, error } = useEntityStateAtDate(
    'rider',
    riderId,
    date
  );

  if (isLoading) return <Skeleton />;
  if (error) return <Error />;

  return (
    <div>
      <p>Status: {data?.status}</p>
      <p>Vehicle: {data?.vehicle_assigned}</p>
      <p>Confidence: {(data?.confidence_score * 100).toFixed(0)}%</p>
    </div>
  );
}
```

### useActiveRidersCountAtDate

```typescript
import { useActiveRidersCountAtDate } from '@/hooks/usePointInTimeQueries';

function HistoricalMetrics({ date }) {
  const { data } = useActiveRidersCountAtDate(date);

  return (
    <MetricCard
      title="Active Riders"
      value={data?.active_riders_count}
      quality={data?.data_quality}
    />
  );
}
```

### useRevenueByPeriod

```typescript
import { useRevenueByPeriod } from '@/hooks/usePointInTimeQueries';

function RevenueChart({ startDate, endDate }) {
  const { data } = useRevenueByPeriod(startDate, endDate, 'month');

  return (
    <Chart
      data={data?.map(d => ({
        date: d.period_start,
        revenue: d.total_revenue
      }))}
    />
  );
}
```

### useEntityTimeline

```typescript
import { useEntityTimeline } from '@/hooks/usePointInTimeQueries';

function RiderTimeline({ riderId }) {
  const { data: events } = useEntityTimeline('rider', riderId);

  return (
    <Timeline>
      {events?.map(event => (
        <TimelineEvent
          key={event.event_date}
          date={event.event_date}
          type={event.event_type}
          isHistorical={event.is_historical}
          confidence={event.confidence}
        />
      ))}
    </Timeline>
  );
}
```

## Historical Dashboard

### Toggle Between Views

```typescript
import { HistoricalDashboardToggle, HistoricalMetricsWrapper } from '@/components/historical';

function Dashboard() {
  const [historicalDate, setHistoricalDate] = useState<Date | null>(null);

  return (
    <div>
      <HistoricalDashboardToggle onDateChange={setHistoricalDate} />

      <HistoricalMetricsWrapper historicalDate={historicalDate}>
        {/* Current or historical metrics */}
        <MetricsGrid />
      </HistoricalMetricsWrapper>
    </div>
  );
}
```

### Data Quality Indicators

```typescript
import { DataQualityIndicator, DataQualityBar } from '@/components/historical';

function RecordCard({ record }) {
  return (
    <Card>
      <DataQualityIndicator
        score={record.confidence_score}
        level={record.data_quality}
      />
      <DataQualityBar score={record.confidence_score} />
    </Card>
  );
}
```

## Performance Considerations

### Indexes

The following indexes support point-in-time queries:
- `idx_riders_effective_dates ON riders(rider_id, effective_start_date, effective_end_date)`
- `idx_vehicles_effective_dates ON vehicles(vehicle_number, effective_start_date, effective_end_date)`
- `idx_batteries_effective_dates ON batteries(battery_id, effective_start_date, effective_end_date)`
- `idx_payments_effective_dates ON payments(payment_id, effective_start_date, effective_end_date)`

### Query Optimization

1. **Use date ranges** when possible
2. **Limit entity types** in timeline queries
3. **Cache results** for frequently accessed dates
4. **Use React Query** for automatic caching

### Caching Strategy

```typescript
// React Query automatically caches results
const { data } = useEntityStateAtDate('rider', 'DR001', date, {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
});
```

## Common Use Cases

### Monthly Fleet Report

```typescript
async function generateMonthlyReport(month: Date) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const [riders, vehicles, revenue] = await Promise.all([
    getActiveRidersCountAtDate(endOfMonth),
    getDeployedVehiclesCountAtDate(endOfMonth),
    getRevenueByPeriod(startOfMonth, endOfMonth, 'day'),
  ]);

  return { riders, vehicles, revenue };
}
```

### Rider History Audit

```typescript
async function auditRiderHistory(riderId: string) {
  const timeline = await getEntityTimeline('rider', riderId);

  // Find gaps in history
  const gaps = findTimelineGaps(timeline);

  // Check for conflicts
  const conflicts = findConflictingEvents(timeline);

  return { gaps, conflicts, timeline };
}
```

### Data Validation

```typescript
async function validateHistoricalData(date: Date) {
  const riders = await getActiveRidersCountAtDate(date);
  const vehicles = await getDeployedVehiclesCountAtDate(date);

  // Check CBU compliance
  if (vehicles.vehicles_with_rider < riders.active_riders_count) {
    console.warn('CBU violation: Some riders lack vehicles');
  }

  // Check data quality
  if (riders.avg_confidence_score < 0.70) {
    console.warn('Low data confidence for date');
  }
}
```

## Querying Manually Entered Historical Data

### Understanding Manual Entry Data Source

When records are created through the UI with past dates, they are automatically tagged with:
- `data_source = 'MANUAL_ENTRY'`
- `confidence_score = 0.70`

These records are included in point-in-time queries alongside CSV-imported and platform-captured data.

### Filtering by Data Source

```typescript
// Get entity state and check if it's a manual entry
const { data } = useEntityStateAtDate('rider', 'DR001', new Date('2024-06-15'));

if (data?.data_source === 'MANUAL_ENTRY') {
  console.log('This record was manually entered with 70% confidence');
}
```

### Querying Mixed Data Sources

Point-in-time queries return data from all sources, ranked by confidence:

```sql
-- Get all active riders at a date, sorted by confidence
SELECT
  rider_id,
  name,
  data_source,
  confidence_score
FROM riders
WHERE effective_start_date <= '2024-06-15'
  AND (effective_end_date IS NULL OR effective_end_date > '2024-06-15')
  AND status = 'active'
ORDER BY confidence_score DESC;
```

### Timeline with Manual Entries

The entity timeline includes manually entered events:

```typescript
const { data: events } = useEntityTimeline('ledger', ledgerId);

// Events with is_historical = true may be from:
// - CSV imports (CL87, payment records, etc.)
// - UI-based retroactive entry (MANUAL_ENTRY)

events?.forEach(event => {
  if (event.is_historical && event.confidence < 0.80) {
    console.log(`Low confidence event: ${event.event_type} on ${event.event_date}`);
  }
});
```

### Data Quality Considerations

When querying historical data that includes manual entries:

| Data Source | Confidence | Considerations |
|-------------|------------|----------------|
| PLATFORM | 1.00 | Definitive - captured in real-time |
| CL87_CSV | 0.90 | High confidence - from official export |
| MANUAL_ENTRY | 0.70 | Moderate confidence - verify if possible |

### Example: Comparing Data Sources

```typescript
import { useActiveRidersCountAtDate } from '@/hooks/usePointInTimeQueries';

function HistoricalDataQualityReport({ date }: { date: Date }) {
  const { data } = useActiveRidersCountAtDate(date);

  return (
    <div>
      <h3>Data Quality for {date.toDateString()}</h3>
      <p>Active Riders: {data?.active_riders_count}</p>
      <p>Avg Confidence: {(data?.avg_confidence_score * 100).toFixed(0)}%</p>
      <p>Quality: {data?.data_quality}</p>

      {data?.avg_confidence_score < 0.80 && (
        <p className="warning">
          This date includes manually entered data.
          Consider verifying critical metrics.
        </p>
      )}
    </div>
  );
}
```
