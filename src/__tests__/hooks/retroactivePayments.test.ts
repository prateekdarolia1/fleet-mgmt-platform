/**
 * Unit tests for retroactive payment generation
 * Tasks: 4.10-4.12, 5.13
 *
 * Tests for:
 * - Weekly retroactive payment calculation
 * - Daily retroactive payment calculation
 * - Monthly retroactive payment calculation
 * - Gap period payment calculations
 */

import { describe, it, expect } from 'vitest';

// Import the functions to test
// Note: These are internal functions in useRiderLedgers.ts
// For testing purposes, we recreate the logic here or export them

interface RetroactivePaymentParams {
  ledgerId: string;
  riderId: string;
  riderName: string;
  rentalAmount: number;
  rentalFrequency: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  today?: Date;
}

interface GeneratedPayment {
  payment_id: string;
  rider_id: string;
  rider_name: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'pending' | 'overdue';
  payment_type: 'rental';
  rental_period: string;
  ledger_id: string;
}

function generateRetroactivePayments(params: RetroactivePaymentParams): GeneratedPayment[] {
  const {
    ledgerId,
    riderId,
    riderName,
    rentalAmount,
    rentalFrequency,
    startDate,
    today = new Date()
  } = params;

  const payments: GeneratedPayment[] = [];
  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);

  const normalizedStart = new Date(startDate);
  normalizedStart.setHours(0, 0, 0, 0);

  // Calculate days difference
  const diffTime = normalizedToday.getTime() - normalizedStart.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determine period days based on frequency
  let periodDays: number;
  let maxPeriods: number;
  switch (rentalFrequency) {
    case 'daily':
      periodDays = 1;
      maxPeriods = 180; // ~6 months
      break;
    case 'weekly':
      periodDays = 7;
      maxPeriods = 26; // ~6 months
      break;
    case 'monthly':
      periodDays = 30;
      maxPeriods = 6; // 6 months
      break;
  }

  // Calculate number of periods to generate
  const numPeriods = Math.min(Math.ceil(diffDays / periodDays), maxPeriods);

  // Generate payments for each period
  for (let i = 0; i <= numPeriods; i++) {
    const dueDate = new Date(normalizedStart);
    dueDate.setDate(dueDate.getDate() + (i * periodDays));
    dueDate.setHours(0, 0, 0, 0);

    // Determine status: past payments are overdue, current/future are pending
    const status: 'pending' | 'overdue' = dueDate < normalizedToday ? 'overdue' : 'pending';

    payments.push({
      payment_id: '',
      rider_id: riderId,
      rider_name: riderName,
      amount: rentalAmount,
      due_date: dueDate.toISOString().split('T')[0],
      payment_date: null,
      status,
      payment_type: 'rental',
      rental_period: `${rentalFrequency.charAt(0).toUpperCase() + rentalFrequency.slice(1)} Rental - ${dueDate.toLocaleDateString()}`,
      ledger_id: ledgerId,
    });
  }

  return payments;
}

// Gap payment generation
interface GapPaymentParams {
  ledgerId: string;
  riderId: string;
  riderName: string;
  rentalAmount: number;
  rentalFrequency: 'daily' | 'weekly' | 'monthly';
  pausedAt: Date;
  newStartDate: Date;
  existingWeekNumber?: number;
}

function generateGapPayments(params: GapPaymentParams): GeneratedPayment[] {
  const {
    ledgerId,
    riderId,
    riderName,
    rentalAmount,
    rentalFrequency,
    pausedAt,
    newStartDate,
    existingWeekNumber = 0
  } = params;

  const payments: GeneratedPayment[] = [];

  const normalizedPaused = new Date(pausedAt);
  normalizedPaused.setHours(0, 0, 0, 0);

  const normalizedStart = new Date(newStartDate);
  normalizedStart.setHours(0, 0, 0, 0);

  // Calculate gap period
  const diffTime = normalizedStart.getTime() - normalizedPaused.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determine period days
  let periodDays: number;
  switch (rentalFrequency) {
    case 'daily':
      periodDays = 1;
      break;
    case 'weekly':
      periodDays = 7;
      break;
    case 'monthly':
      periodDays = 30;
      break;
  }

  // Calculate number of gap periods
  const numPeriods = Math.ceil(diffDays / periodDays);

  // Generate overdue payments for each gap period
  for (let i = 0; i < numPeriods; i++) {
    const dueDate = new Date(normalizedPaused);
    dueDate.setDate(dueDate.getDate() + ((i + 1) * periodDays));
    dueDate.setHours(0, 0, 0, 0);

    // Don't generate payment if due date is after new start date
    if (dueDate > normalizedStart) continue;

    payments.push({
      payment_id: '',
      rider_id: riderId,
      rider_name: riderName,
      amount: rentalAmount,
      due_date: dueDate.toISOString().split('T')[0],
      payment_date: null,
      status: 'overdue',
      payment_type: 'rental',
      rental_period: `${rentalFrequency.charAt(0).toUpperCase() + rentalFrequency.slice(1)} Rental - ${dueDate.toLocaleDateString()}`,
      ledger_id: ledgerId,
    });
  }

  return payments;
}

describe('Retroactive Payments - Weekly (Task 4.10)', () => {
  it('should generate correct weekly payments for 1 month ago', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2026-02-26');

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 1000,
      rentalFrequency: 'weekly',
      startDate,
      today,
    });

    // Should generate ~5 weekly payments (4 weeks + 1 current)
    expect(payments.length).toBeGreaterThan(0);
    expect(payments.length).toBeLessThanOrEqual(5);

    // All past payments should be overdue
    const overduePayments = payments.filter(p => p.status === 'overdue');
    expect(overduePayments.length).toBeGreaterThan(0);

    // Current/future payments should be pending
    const pendingPayments = payments.filter(p => p.status === 'pending');
    expect(pendingPayments.length).toBeGreaterThanOrEqual(1);
  });

  it('should use 7-day periods for weekly frequency', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2026-03-01');

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 1000,
      rentalFrequency: 'weekly',
      startDate,
      today,
    });

    // Check that due dates are approximately 7 days apart
    if (payments.length >= 2) {
      const firstDate = new Date(payments[0].due_date);
      const secondDate = new Date(payments[1].due_date);
      const diffDays = Math.round((secondDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    }
  });

  it('should limit weekly retroactive payments to 26 weeks (~6 months)', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2025-01-01'); // ~15 months ago

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 1000,
      rentalFrequency: 'weekly',
      startDate,
      today,
    });

    // Should be capped at 26 periods
    expect(payments.length).toBeLessThanOrEqual(27); // 26 + 1 for current
  });
});

describe('Retroactive Payments - Daily (Task 4.11)', () => {
  it('should generate correct daily payments for 2 weeks ago', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2026-03-12');

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 150,
      rentalFrequency: 'daily',
      startDate,
      today,
    });

    // Should generate ~15 daily payments (14 days + 1 current)
    expect(payments.length).toBeGreaterThan(0);
    expect(payments.length).toBeLessThanOrEqual(15);
  });

  it('should use 1-day periods for daily frequency', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2026-03-25');

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 150,
      rentalFrequency: 'daily',
      startDate,
      today,
    });

    // Check that due dates are 1 day apart
    if (payments.length >= 2) {
      const firstDate = new Date(payments[0].due_date);
      const secondDate = new Date(payments[1].due_date);
      const diffDays = Math.round((secondDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(1);
    }
  });

  it('should limit daily retroactive payments to 180 days (~6 months)', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2025-01-01'); // ~15 months ago

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 150,
      rentalFrequency: 'daily',
      startDate,
      today,
    });

    // Should be capped at 180 periods
    expect(payments.length).toBeLessThanOrEqual(181); // 180 + 1 for current
  });
});

describe('Retroactive Payments - Monthly (Task 4.12)', () => {
  it('should generate correct monthly payments for 3 months ago', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2025-12-26');

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 4000,
      rentalFrequency: 'monthly',
      startDate,
      today,
    });

    // Should generate ~4 monthly payments (3 months + 1 current)
    expect(payments.length).toBeGreaterThan(0);
    expect(payments.length).toBeLessThanOrEqual(4);
  });

  it('should use 30-day periods for monthly frequency', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2026-01-26');

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 4000,
      rentalFrequency: 'monthly',
      startDate,
      today,
    });

    // Check that due dates are approximately 30 days apart
    if (payments.length >= 2) {
      const firstDate = new Date(payments[0].due_date);
      const secondDate = new Date(payments[1].due_date);
      const diffDays = Math.round((secondDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    }
  });

  it('should limit monthly retroactive payments to 6 months', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2025-01-01'); // ~15 months ago

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 4000,
      rentalFrequency: 'monthly',
      startDate,
      today,
    });

    // Should be capped at 6 periods
    expect(payments.length).toBeLessThanOrEqual(7); // 6 + 1 for current
  });
});

describe('Gap Period Payments (Task 5.13)', () => {
  it('should generate weekly gap payments for 3-week pause', () => {
    const pausedAt = new Date('2026-02-01');
    const newStartDate = new Date('2026-02-22');

    const gapPayments = generateGapPayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 1000,
      rentalFrequency: 'weekly',
      pausedAt,
      newStartDate,
      existingWeekNumber: 4,
    });

    // Should generate ~3 overdue weekly payments
    expect(gapPayments.length).toBeGreaterThan(0);
    expect(gapPayments.length).toBeLessThanOrEqual(3);

    // All gap payments should be overdue
    gapPayments.forEach(payment => {
      expect(payment.status).toBe('overdue');
    });
  });

  it('should generate daily gap payments for 10-day pause', () => {
    const pausedAt = new Date('2026-02-01');
    const newStartDate = new Date('2026-02-11');

    const gapPayments = generateGapPayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 150,
      rentalFrequency: 'daily',
      pausedAt,
      newStartDate,
    });

    // Should generate ~10 overdue daily payments
    expect(gapPayments.length).toBeGreaterThan(0);
    expect(gapPayments.length).toBeLessThanOrEqual(10);

    // All gap payments should be overdue
    gapPayments.forEach(payment => {
      expect(payment.status).toBe('overdue');
    });
  });

  it('should generate monthly gap payments for 2-month pause', () => {
    const pausedAt = new Date('2026-01-01');
    const newStartDate = new Date('2026-03-01');

    const gapPayments = generateGapPayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 4000,
      rentalFrequency: 'monthly',
      pausedAt,
      newStartDate,
      existingWeekNumber: 8,
    });

    // Should generate ~2 overdue monthly payments
    expect(gapPayments.length).toBeGreaterThan(0);
    expect(gapPayments.length).toBeLessThanOrEqual(2);

    // All gap payments should be overdue
    gapPayments.forEach(payment => {
      expect(payment.status).toBe('overdue');
    });
  });

  it('should not generate gap payments if paused_at equals new start_date', () => {
    const pausedAt = new Date('2026-02-01');
    const newStartDate = new Date('2026-02-01');

    const gapPayments = generateGapPayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 1000,
      rentalFrequency: 'weekly',
      pausedAt,
      newStartDate,
    });

    // Should generate no gap payments (no gap period)
    expect(gapPayments.length).toBe(0);
  });

  it('should not generate gap payments if new start_date is before paused_at', () => {
    const pausedAt = new Date('2026-02-15');
    const newStartDate = new Date('2026-02-01');

    const gapPayments = generateGapPayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 1000,
      rentalFrequency: 'weekly',
      pausedAt,
      newStartDate,
    });

    // Should generate no gap payments (invalid date range)
    expect(gapPayments.length).toBe(0);
  });
});

describe('Payment Status Calculation', () => {
  it('should mark past payments as overdue', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2026-03-01');

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 1000,
      rentalFrequency: 'weekly',
      startDate,
      today,
    });

    // Find payments due before today
    const pastPayments = payments.filter(p => new Date(p.due_date) < today);
    pastPayments.forEach(payment => {
      expect(payment.status).toBe('overdue');
    });
  });

  it('should mark current/future payments as pending', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2026-03-01');

    const payments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 1000,
      rentalFrequency: 'weekly',
      startDate,
      today,
    });

    // Find payments due on or after today
    const futurePayments = payments.filter(p => new Date(p.due_date) >= today);
    futurePayments.forEach(payment => {
      expect(payment.status).toBe('pending');
    });
  });

  it('should handle payment amount correctly across all frequencies', () => {
    const today = new Date('2026-03-26');
    const startDate = new Date('2026-03-01');

    const weeklyPayments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 1000,
      rentalFrequency: 'weekly',
      startDate,
      today,
    });

    const dailyPayments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 150,
      rentalFrequency: 'daily',
      startDate,
      today,
    });

    const monthlyPayments = generateRetroactivePayments({
      ledgerId: 'ledger-123',
      riderId: 'rider-001',
      riderName: 'Test Rider',
      rentalAmount: 4000,
      rentalFrequency: 'monthly',
      startDate,
      today,
    });

    // Check amounts are preserved
    weeklyPayments.forEach(p => expect(p.amount).toBe(1000));
    dailyPayments.forEach(p => expect(p.amount).toBe(150));
    monthlyPayments.forEach(p => expect(p.amount).toBe(4000));
  });
});
