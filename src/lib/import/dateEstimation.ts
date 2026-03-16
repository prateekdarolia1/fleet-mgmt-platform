/**
 * Date Estimation Rules Engine
 *
 * Provides business rules for estimating missing dates in historical data imports.
 * Each estimation rule has an associated confidence score.
 */

import type { DataSource, ConfidenceLevel } from '@/types/historical';
import { getConfidenceLevel, CONFIDENCE_THRESHOLDS } from '@/types/historical';

// ============================================================================
// CONFIDENCE SCORES BY DATA SOURCE
// ============================================================================

export const DATA_SOURCE_CONFIDENCE: Record<DataSource, number> = {
  PLATFORM: 1.00,
  EXACT_REVENUE_CSV: 0.95,
  CL87_CSV: 0.90,
  PAYMENT_RECORDS_CSV: 0.90,
  BATTERY_SMART_CSV: 0.85,
  MANUAL_ENTRY: 0.70,
  ESTIMATED_DATE: 0.50,
  DEFAULT_FILL: 0.30,
};

// ============================================================================
// ESTIMATION RESULT TYPE
// ============================================================================

export interface EstimationResult {
  estimatedDate: Date | null;
  confidenceScore: number;
  estimationMethod: string;
  dataSource: DataSource;
  notes?: string;
}

// ============================================================================
// DATE ESTIMATION RULES
// ============================================================================

/**
 * RULE 1: Estimate Rider Onboarding Date
 *
 * IF: rider.onboard_date is unknown
 * THEN: Use MIN(battery_deployment_date for their vehicles)
 *       OR vehicle_assigned date from CSV
 *       confidence = 0.50
 */
export function estimateOnboardDate(
  rider: { onboard_date?: string | null; join_date?: string | null },
  assignments: Array<{ deployment_date?: string | null; assigned_date?: string | null }>
): EstimationResult {
  // If we already have an onboard date, use it with high confidence
  if (rider.onboard_date) {
    return {
      estimatedDate: new Date(rider.onboard_date),
      confidenceScore: 1.00,
      estimationMethod: 'existing_onboard_date',
      dataSource: 'PLATFORM',
    };
  }

  // Try join_date as fallback
  if (rider.join_date) {
    return {
      estimatedDate: new Date(rider.join_date),
      confidenceScore: 0.80,
      estimationMethod: 'join_date_fallback',
      dataSource: 'PLATFORM',
      notes: 'Used join_date as onboard_date was not available',
    };
  }

  // Find earliest deployment/assignment date
  const dates = assignments
    .map(a => a.deployment_date || a.assigned_date)
    .filter((d): d is string => d != null)
    .map(d => new Date(d).getTime());

  if (dates.length > 0) {
    const earliestDate = new Date(Math.min(...dates));
    return {
      estimatedDate: earliestDate,
      confidenceScore: 0.50,
      estimationMethod: 'earliest_deployment_date',
      dataSource: 'ESTIMATED_DATE',
      notes: 'Estimated from earliest vehicle deployment date',
    };
  }

  // Cannot estimate
  return {
    estimatedDate: null,
    confidenceScore: 0.00,
    estimationMethod: 'unable_to_estimate',
    dataSource: 'DEFAULT_FILL',
    notes: 'No data available to estimate onboard date',
  };
}

/**
 * RULE 2: Estimate Rider Deboarding Date
 *
 * IF: rider.status = 'deboarded' but date unknown
 * THEN: Use last_payment_date + 7 days
 *       OR last_vehicle_unassignment_date
 *       confidence = 0.50
 */
export function estimateDeboardDate(
  rider: { status: string; deboard_date?: string | null },
  payments: Array<{ payment_date?: string | null }>,
  unassignmentDate?: string | null
): EstimationResult {
  // If we already have a deboard date, use it with high confidence
  if (rider.deboard_date) {
    return {
      estimatedDate: new Date(rider.deboard_date),
      confidenceScore: 1.00,
      estimationMethod: 'existing_deboard_date',
      dataSource: 'PLATFORM',
    };
  }

  // If rider is not deboarded, return null
  if (rider.status !== 'deboarded') {
    return {
      estimatedDate: null,
      confidenceScore: 1.00,
      estimationMethod: 'not_deboarded',
      dataSource: 'PLATFORM',
      notes: 'Rider is not deboarded, no deboard date needed',
    };
  }

  // Try last_payment_date + 7 days
  const paymentDates = payments
    .map(p => p.payment_date)
    .filter((d): d is string => d != null)
    .map(d => new Date(d).getTime());

  if (paymentDates.length > 0) {
    const lastPaymentDate = new Date(Math.max(...paymentDates));
    const estimatedDeboard = new Date(lastPaymentDate);
    estimatedDeboard.setDate(estimatedDeboard.getDate() + 7);

    return {
      estimatedDate: estimatedDeboard,
      confidenceScore: 0.50,
      estimationMethod: 'last_payment_plus_7',
      dataSource: 'ESTIMATED_DATE',
      notes: 'Estimated from last payment date + 7 days',
    };
  }

  // Try unassignment date
  if (unassignmentDate) {
    return {
      estimatedDate: new Date(unassignmentDate),
      confidenceScore: 0.50,
      estimationMethod: 'vehicle_unassignment',
      dataSource: 'ESTIMATED_DATE',
      notes: 'Estimated from vehicle unassignment date',
    };
  }

  // Cannot estimate
  return {
    estimatedDate: null,
    confidenceScore: 0.00,
    estimationMethod: 'unable_to_estimate',
    dataSource: 'DEFAULT_FILL',
    notes: 'No data available to estimate deboard date',
  };
}

/**
 * RULE 3: Estimate Vehicle Assignment Date
 *
 * IF: vehicle.rider_id set but no assignment date
 * THEN: Use battery_deployment_date (batteries deployed together)
 *       confidence = 0.70
 */
export function estimateAssignmentDate(
  vehicle: { rider_id?: string | null; rental_start_date?: string | null },
  battery: { deployment_date?: string | null; created_at?: string } | null
): EstimationResult {
  // If no rider assigned, no assignment date needed
  if (!vehicle.rider_id) {
    return {
      estimatedDate: null,
      confidenceScore: 1.00,
      estimationMethod: 'no_rider_assigned',
      dataSource: 'PLATFORM',
      notes: 'No rider assigned, no assignment date needed',
    };
  }

  // Try rental_start_date first
  if (vehicle.rental_start_date) {
    return {
      estimatedDate: new Date(vehicle.rental_start_date),
      confidenceScore: 0.90,
      estimationMethod: 'rental_start_date',
      dataSource: 'PLATFORM',
    };
  }

  // Try battery deployment date
  if (battery?.deployment_date) {
    return {
      estimatedDate: new Date(battery.deployment_date),
      confidenceScore: 0.70,
      estimationMethod: 'battery_deployment_date',
      dataSource: 'ESTIMATED_DATE',
      notes: 'Estimated from battery deployment date',
    };
  }

  // Try battery created_at as last resort
  if (battery?.created_at) {
    return {
      estimatedDate: new Date(battery.created_at),
      confidenceScore: 0.50,
      estimationMethod: 'battery_created_at',
      dataSource: 'ESTIMATED_DATE',
      notes: 'Estimated from battery creation date',
    };
  }

  // Cannot estimate
  return {
    estimatedDate: null,
    confidenceScore: 0.00,
    estimationMethod: 'unable_to_estimate',
    dataSource: 'DEFAULT_FILL',
    notes: 'No data available to estimate assignment date',
  };
}

/**
 * RULE 4: Estimate Payment Due Date
 *
 * IF: payment exists but due_date unclear
 * THEN: Use rental_plan start_date + weekly offset
 *       confidence = 0.60
 */
export function estimateDueDate(
  payment: { due_date?: string | null; week_number?: number },
  ledger: { rental_start_date?: string | null } | null
): EstimationResult {
  // If we already have a due date, use it
  if (payment.due_date) {
    return {
      estimatedDate: new Date(payment.due_date),
      confidenceScore: 1.00,
      estimationMethod: 'existing_due_date',
      dataSource: 'PLATFORM',
    };
  }

  // Try to calculate from rental start date + week offset
  if (ledger?.rental_start_date && payment.week_number) {
    const startDate = new Date(ledger.rental_start_date);
    const estimatedDue = new Date(startDate);
    estimatedDue.setDate(estimatedDue.getDate() + (payment.week_number - 1) * 7);

    return {
      estimatedDate: estimatedDue,
      confidenceScore: 0.60,
      estimationMethod: 'rental_start_plus_weeks',
      dataSource: 'ESTIMATED_DATE',
      notes: `Estimated from rental start + week ${payment.week_number}`,
    };
  }

  // Cannot estimate
  return {
    estimatedDate: null,
    confidenceScore: 0.00,
    estimationMethod: 'unable_to_estimate',
    dataSource: 'DEFAULT_FILL',
    notes: 'No data available to estimate due date',
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get confidence score for an estimation type
 */
export function getConfidenceScore(estimationMethod: string): number {
  const scores: Record<string, number> = {
    // High confidence - direct data
    existing_onboard_date: 1.00,
    existing_deboard_date: 1.00,
    existing_due_date: 1.00,
    not_deboarded: 1.00,
    no_rider_assigned: 1.00,

    // Medium-high confidence - derived from platform data
    join_date_fallback: 0.80,
    rental_start_date: 0.90,

    // Medium confidence - estimated from related data
    earliest_deployment_date: 0.50,
    last_payment_plus_7: 0.50,
    vehicle_unassignment: 0.50,
    battery_deployment_date: 0.70,
    battery_created_at: 0.50,
    rental_start_plus_weeks: 0.60,

    // Low confidence - cannot estimate
    unable_to_estimate: 0.00,
  };

  return scores[estimationMethod] ?? 0.30;
}

/**
 * Get data quality level for a confidence score
 */
export function getDataQuality(score: number): ConfidenceLevel {
  return getConfidenceLevel(score);
}

/**
 * Check if a confidence score is acceptable for import
 */
export function isConfidenceAcceptable(score: number, threshold = 0.50): boolean {
  return score >= threshold;
}

/**
 * Format a date for database storage
 */
export function formatDateForDb(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

/**
 * Parse a date from various formats
 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);
  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Calculate effective dates for a record
 */
export function calculateEffectiveDates(
  startDate: Date | null,
  endDate: Date | null = null
): { effective_start_date: string | null; effective_end_date: string | null } {
  return {
    effective_start_date: formatDateForDb(startDate),
    effective_end_date: endDate ? formatDateForDb(endDate) : null,
  };
}
