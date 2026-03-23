/**
 * Migration Verification Tests: Ledger Lifecycle Management
 *
 * These tests verify that the database migration ran successfully.
 * If these fail, the issue is in the DATABASE LAYER (migration not run or incomplete).
 *
 * Run with: npx vitest run src/__tests__/migrations/ledger-lifecycle.migration.test.ts
 */

import { supabase } from '@/integrations/supabase/client';
import { describe, it, expect } from 'vitest';

describe('Ledger Lifecycle Migration Verification', () => {

  describe('Ledger Status Enum', () => {
    it('ledger_status enum exists with correct values', async () => {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT enumlabel
          FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_status')
          ORDER BY enumsortorder
        `
      });

      expect(error).toBeNull();
      const values = data?.map((row: any) => row.enumlabel) || [];
      expect(values).toContain('active');
      expect(values).toContain('paused');
      expect(values).toContain('closed');
    });
  });

  describe('Security Deposit Status Enum', () => {
    it('security_deposit_status enum exists with correct values', async () => {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT enumlabel
          FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'security_deposit_status')
          ORDER BY enumsortorder
        `
      });

      expect(error).toBeNull();
      const values = data?.map((row: any) => row.enumlabel) || [];
      expect(values).toContain('retained');
      expect(values).toContain('refunded');
      expect(values).toContain('partially_refunded');
    });
  });

  describe('Payment Status Enum', () => {
    it('payment_status enum includes cancelled value', async () => {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT enumlabel
          FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
        `
      });

      expect(error).toBeNull();
      const values = data?.map((row: any) => row.enumlabel) || [];
      expect(values).toContain('cancelled');
    });
  });

  describe('Rider Ledgers Table Columns', () => {
    it('status column exists with default active', async () => {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT column_name, column_default, data_type
          FROM information_schema.columns
          WHERE table_name = 'rider_ledgers'
          AND column_name = 'status'
        `
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]?.column_default).toContain('active');
    });

    it('pause tracking columns exist', async () => {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'rider_ledgers'
          AND column_name IN ('paused_at', 'paused_reason')
        `
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it('reactivation tracking column exists', async () => {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'rider_ledgers'
          AND column_name = 'reactivated_at'
        `
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('deposit tracking columns exist', async () => {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'rider_ledgers'
          AND column_name IN ('security_deposit_status', 'deposit_refunded_at', 'deposit_refunded_amount')
        `
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
    });
  });

  describe('Payments Table Columns', () => {
    it('cancellation tracking columns exist', async () => {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'payments'
          AND column_name IN ('cancelled_at', 'cancelled_by')
        `
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });
  });

  describe('Indexes', () => {
    it('idx_ledgers_status index exists', async () => {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = 'rider_ledgers'
          AND indexname = 'idx_ledgers_status'
        `
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('idx_payments_status index exists', async () => {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = 'payments'
          AND indexname = 'idx_payments_status'
        `
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe('Functional Tests (Insert with new values)', () => {
    it('can insert ledger with status=paused', async () => {
      // This test uses a test ledger ID if available
      // In real tests, you'd use a known test rider_id
      const testRiderId = 'TEST_RIDER_MIGRATION_CHECK';

      const { error } = await supabase
        .from('rider_ledgers')
        .insert({
          rider_id: testRiderId,
          rider_name: 'Migration Test',
          security_deposit_amount: 0,
          rental_frequency: 'monthly',
          rental_amount: 0,
          rental_start_date: '2024-01-01',
          status: 'paused',
          paused_at: new Date().toISOString(),
          paused_reason: 'Migration verification test',
          security_deposit_status: 'retained'
        })
        .select();

      // If insert fails with "invalid input value for enum", migration didn't run
      if (error) {
        // Check if it's a duplicate key error (expected if test ran before)
        if (!error.message.includes('duplicate')) {
          expect(error).toBeNull();
        }
      }

      // Cleanup
      await supabase
        .from('rider_ledgers')
        .delete()
        .eq('rider_id', testRiderId);
    });

    it('can insert payment with status=cancelled', async () => {
      // This would require an existing ledger_id in practice
      // For migration verification, we just check the enum accepts the value
      const { error } = await supabase.rpc('execute_sql', {
        query: `
          SELECT 'cancelled'::payment_status AS status
        `
      });

      expect(error).toBeNull();
    });
  });
});
