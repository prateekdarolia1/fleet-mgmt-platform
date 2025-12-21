import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React, { useEffect } from 'react';
import { useVehicles } from '@/hooks/useVehicles';

// Mock toasts
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Supabase mock infra
let fromMock: any;
vi.mock('@/integrations/supabase/client', () => {
  fromMock = vi.fn();
  return {
    supabase: {
      from: (...args: any[]) => fromMock(...args),
    },
  };
});

function HookHarness({ onReady }: { onReady: (api: ReturnType<typeof useVehicles>) => void }) {
  const api = useVehicles();
  useEffect(() => {
    onReady(api);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe('useVehicles hook', () => {
  it('fetchVehicles sets error when network fails', async () => {
    // Chain: from('vehicles').select('*').order(...)
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('TypeError: Failed to fetch') }),
    };
    fromMock.mockImplementation((table: string) => {
      if (table === 'vehicles') return chain as any;
      throw new Error('Unexpected table: ' + table);
    });

    let apiRef: any;
    render(<HookHarness onReady={(api) => (apiRef = api)} />);

    // Wait for fetchVehicles useEffect to run
    await new Promise((r) => setTimeout(r, 0));

    expect(apiRef.loading).toBe(false);
    expect(typeof apiRef.error).toBe('string');
    expect(apiRef.error).toMatch(/Failed to fetch/i);
  });

  it('addVehicle throws when insert fails with network error', async () => {
    // Prepare chain for insert: insert().select().single()
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error('TypeError: Failed to fetch') });
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single,
    };
    fromMock.mockImplementation((table: string) => {
      if (table === 'vehicles') return chain as any;
      throw new Error('Unexpected table: ' + table);
    });

    let apiRef: any;
    render(<HookHarness onReady={(api) => (apiRef = api)} />);

    await expect(
      apiRef.addVehicle({
        make: 'Evolet',
        model: 'Polo',
        color: 'Maroon',
        chassis_number: 'X',
        motor_serial_number: 'Y',
        delivery_date: '2025-07-11',
        vendor: 'Risalla EV',
        pdi_done_by: 'Tester',
        registration_received: false,
        insurance_received: false,
        portable_charger_received: false,
        vehicle_type: 'Low Speed',
        battery_type: 'Swappable',
        vehicle_number: 'EVP001',
      })
    ).rejects.toThrow(/Failed to fetch/);
  });
});
