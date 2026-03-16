/**
 * Historical Data Management System - TypeScript Types
 * Types for point-in-time queries, retroactive imports, and data quality tracking
 */

// ============================================================================
// DATA SOURCE TYPES
// ============================================================================

/**
 * Possible data sources for entity records
 * Priority order: EXACT_REVENUE_CSV > CL87_CSV > BATTERY_SMART_EXPORT > PLATFORM > ESTIMATED
 */
export type DataSource =
  | 'PLATFORM'           // Real-time platform capture (confidence: 1.00)
  | 'CL87_CSV'           // CL87 Battery Smart export (confidence: 0.90)
  | 'BATTERY_SMART_CSV'  // Battery Smart export (confidence: 0.85)
  | 'EXACT_REVENUE_CSV'  // Exact revenue records (confidence: 0.95)
  | 'PAYMENT_RECORDS_CSV' // Payment records CSV (confidence: 0.90)
  | 'MANUAL_ENTRY'       // Human-entered data (confidence: 0.70)
  | 'ESTIMATED_DATE'     // Calculated/derived dates (confidence: 0.50)
  | 'DEFAULT_FILL';      // Assumed values (confidence: 0.30)

/**
 * Confidence score ranges and their meanings
 */
export type ConfidenceLevel = 'high' | 'moderate' | 'low';

export const CONFIDENCE_THRESHOLDS = {
  high: 0.90,
  moderate: 0.70,
  low: 0.00,
} as const;

/**
 * Get confidence level from score
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (score >= CONFIDENCE_THRESHOLDS.moderate) return 'moderate';
  return 'low';
}

// ============================================================================
// HISTORICAL RECORD INTERFACE
// ============================================================================

/**
 * Base interface for all entities with historical tracking
 */
export interface HistoricalRecord {
  effective_start_date: string | null;
  effective_end_date: string | null;
  is_historical_import: boolean;
  data_source: DataSource;
  import_batch_id: string | null;
  confidence_score: number; // 0.00 - 1.00
}

// ============================================================================
// IMPORT BATCH TYPES
// ============================================================================

/**
 * Status of an import batch
 */
export type ImportBatchStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';

/**
 * Data import batch record
 */
export interface DataImportBatch {
  id: string;
  batch_name: string;
  source_file: string;
  import_date: string;
  data_period_start: string | null;
  data_period_end: string | null;
  records_total: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  defaults_applied: Record<string, unknown>;
  warnings: string[];
  status: ImportBatchStatus;
  imported_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Summary of an import batch (from get_import_batch_summary function)
 */
export interface ImportBatchSummary {
  batch_id: string;
  batch_name: string;
  source_file: string;
  import_date: string;
  data_period: {
    start: string | null;
    end: string | null;
  };
  status: ImportBatchStatus;
  records: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
  };
  by_entity_type: {
    riders_created: number;
    vehicles_created: number;
    batteries_created: number;
    payments_created: number;
  };
  retroactive_events_created: number;
  defaults_applied: Record<string, unknown>;
  warnings: string[];
}

// ============================================================================
// RETROACTIVE EVENT TYPES
// ============================================================================

/**
 * Entity types that support retroactive events
 */
export type RetroactiveEntityType = 'rider' | 'vehicle' | 'battery' | 'payment' | 'rental_ledger';

/**
 * Event types for retroactive events
 */
export type RetroactiveEventType =
  | 'ONBOARD'      // Rider onboarded
  | 'DEBOARD'      // Rider deboarded
  | 'ASSIGN'       // Vehicle/Battery assigned
  | 'UNASSIGN'     // Vehicle/Battery unassigned
  | 'DEPLOY'       // Vehicle deployed
  | 'UNDEPLOY'     // Vehicle undeployed
  | 'PAYMENT'      // Payment recorded
  | 'STATUS_CHANGE'; // Generic status change

/**
 * Retroactive event record
 */
export interface RetroactiveEvent {
  id: string;
  entity_type: RetroactiveEntityType;
  entity_id: string;
  event_type: RetroactiveEventType;
  effective_date: string;
  recorded_date: string;
  event_data: Record<string, unknown>;
  source: DataSource;
  confidence: number;
  notes: string | null;
  import_batch_id: string | null;
  created_at: string;
}

// ============================================================================
// POINT-IN-TIME QUERY RESULT TYPES
// ============================================================================

/**
 * Result from get_entity_state_at_date function
 */
export interface EntityStateAtDate {
  entity_type: string;
  entity_id: string;
  effective_start_date: string | null;
  effective_end_date: string | null;
  confidence_score: number;
  data_source: DataSource;
  is_historical_import: boolean;
  error?: string;
  queried_date?: string;
}

/**
 * Result from get_active_riders_count_at_date function
 */
export interface ActiveRidersCountAtDate {
  date: string;
  active_riders_count: number;
  avg_confidence_score: number;
  data_quality: ConfidenceLevel;
}

/**
 * Result from get_deployed_vehicles_count_at_date function
 */
export interface DeployedVehiclesCountAtDate {
  date: string;
  deployed_vehicles_count: number;
  vehicles_with_rider: number;
  vehicles_without_rider: number;
  avg_confidence_score: number;
  data_quality: ConfidenceLevel;
}

/**
 * Result from get_revenue_by_period function
 */
export interface RevenueByPeriod {
  period_start: string;
  period_end: string;
  total_revenue: number;
  payment_count: number;
  avg_confidence_score: number;
  data_quality: ConfidenceLevel;
}

/**
 * Timeline event from get_entity_timeline function
 */
export interface TimelineEvent {
  event_date: string;
  event_type: string;
  event_source: string;
  event_data: Record<string, unknown>;
  confidence: number;
  is_historical: boolean;
}

// ============================================================================
// RECONCILIATION TYPES
// ============================================================================

/**
 * Match category during reconciliation
 */
export type MatchCategory = 'EXACT_MATCH' | 'CONFLICT' | 'NEW_RECORD' | 'MISSING_IN_CSV';

/**
 * Reconciliation match result
 */
export interface ReconciliationMatch {
  csvRecord: Record<string, unknown>;
  dbRecord: Record<string, unknown> | null;
  category: MatchCategory;
  conflicts?: Array<{
    field: string;
    csvValue: unknown;
    dbValue: unknown;
    resolution: 'csv' | 'db' | 'manual';
  }>;
}

/**
 * Preview report for import
 */
export interface ImportPreviewReport {
  totalRecords: number;
  exactMatches: number;
  conflicts: number;
  newRecords: number;
  missingInCSV: number;
  lowConfidenceRecords: number;
  ghostRecordsNeeded: number;
  matches: ReconciliationMatch[];
}

// ============================================================================
// IMPORT WORKFLOW TYPES
// ============================================================================

/**
 * Phase of the import workflow
 */
export type ImportPhase = 'prepare' | 'reconcile' | 'transform' | 'execute' | 'verify';

/**
 * Import options
 */
export interface ImportOptions {
  batchName: string;
  sourceFile: string;
  dataSource: DataSource;
  createGhostRecords: boolean;
  applyDateEstimation: boolean;
  stopOnConflict: boolean;
  dryRun: boolean;
}

/**
 * Result of each import phase
 */
export interface ImportPhaseResult {
  phase: ImportPhase;
  success: boolean;
  duration_ms: number;
  error?: string;
  data?: unknown;
}

/**
 * Complete import result
 */
export interface ImportResult {
  batchId: string;
  success: boolean;
  phases: ImportPhaseResult[];
  summary: ImportBatchSummary | null;
  error?: string;
}

// ============================================================================
// EXTENDED ENTITY TYPES
// ============================================================================

/**
 * Rider with historical tracking fields
 */
export interface RiderWithHistorical {
  rider_id: string;
  name: string;
  phone: string;
  status: string;
  duty_status: string | null;
  vehicle_assigned: string | null;
  onboard_date: string | null;
  deboard_date: string | null;
  // Historical tracking fields
  effective_start_date: string | null;
  effective_end_date: string | null;
  is_historical_import: boolean;
  data_source: DataSource;
  import_batch_id: string | null;
  confidence_score: number;
}

/**
 * Vehicle with historical tracking fields
 */
export interface VehicleWithHistorical {
  vehicle_number: string;
  status: string;
  rider_id: string | null;
  make: string | null;
  model: string | null;
  // Historical tracking fields
  effective_start_date: string | null;
  effective_end_date: string | null;
  is_historical_import: boolean;
  data_source: DataSource;
  import_batch_id: string | null;
  confidence_score: number;
}

/**
 * Battery with historical tracking fields
 */
export interface BatteryWithHistorical {
  battery_id: string;
  status: string;
  vehicle_id: string | null;
  service_provider: string | null;
  // Historical tracking fields
  effective_start_date: string | null;
  effective_end_date: string | null;
  is_historical_import: boolean;
  data_source: DataSource;
  import_batch_id: string | null;
  confidence_score: number;
}

/**
 * Payment with historical tracking fields
 */
export interface PaymentWithHistorical {
  payment_id: string;
  rider_id: string;
  amount: number;
  status: string;
  due_date: string | null;
  payment_date: string | null;
  method: string | null;
  // Historical tracking fields
  effective_start_date: string | null;
  effective_end_date: string | null;
  is_historical_import: boolean;
  data_source: DataSource;
  import_batch_id: string | null;
  confidence_score: number;
}
