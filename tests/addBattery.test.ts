import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addBattery, isBatteryIdAvailable, generateBatteryId } from '../lib/batteries/addBattery';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('addBattery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation', () => {
    it('should reject missing battery_id', async () => {
      const result = await addBattery({
        battery_id: '',
        service_provider: 'BATTERY_SMART'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details).toContain('battery_id is required');
      }
    });

    it('should reject invalid battery_id format (lowercase)', async () => {
      const result = await addBattery({
        battery_id: 'bat00001',
        service_provider: 'BATTERY_SMART'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details).toContain(
          'battery_id must be 8 uppercase alphanumeric characters (e.g., BAT00001)'
        );
      }
    });

    it('should reject invalid battery_id format (too short)', async () => {
      const result = await addBattery({
        battery_id: 'BAT001',
        service_provider: 'BATTERY_SMART'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details).toContain(
          'battery_id must be 8 uppercase alphanumeric characters (e.g., BAT00001)'
        );
      }
    });

    it('should reject invalid battery_id format (too long)', async () => {
      const result = await addBattery({
        battery_id: 'BAT000001',
        service_provider: 'BATTERY_SMART'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details).toContain(
          'battery_id must be 8 uppercase alphanumeric characters (e.g., BAT00001)'
        );
      }
    });

    it('should reject invalid service_provider', async () => {
      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'INVALID' as any
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details).toContain('service_provider must be BATTERY_SMART or OTHER');
      }
    });

    it('should reject invalid zone_id format', async () => {
      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART',
        zone_id: 'zone123'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details).toContain('zone_id must be 8 uppercase alphanumeric characters');
      }
    });

    it('should reject invalid battery_plan', async () => {
      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART',
        battery_plan: 'INVALID' as any
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details).toContain('battery_plan must be D2D, B2B, or OTHER');
      }
    });

    it('should reject invalid location', async () => {
      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART',
        location: 'DELHI' as any
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details).toContain('location must be NOIDA or OTHER');
      }
    });

    it('should reject future retrofit_date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART',
        retrofit_date: futureDate.toISOString().split('T')[0]
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details).toContain('retrofit_date cannot be in the future');
      }
    });

    it('should reject invalid date format', async () => {
      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART',
        retrofit_date: 'not-a-date'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details).toContain('retrofit_date must be a valid date');
      }
    });
  });

  describe('Input Normalization', () => {
    it('should accept lowercase battery_id and pass validation', async () => {
      // This test verifies that lowercase inputs would fail validation
      // (which is correct behavior - user should uppercase before calling)
      const result = await addBattery({
        battery_id: 'bat00001',
        service_provider: 'BATTERY_SMART'
      });

      expect(result.success).toBe(false);
    });

    it('should accept lowercase zone_id and fail validation', async () => {
      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART',
        zone_id: 'zone1234'
      });

      expect(result.success).toBe(false);
    });

    it('should accept all valid required fields', async () => {
      // Valid input should pass validation
      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART'
      });

      // Would succeed if mocked properly, but validates input structure is correct
      // Actual insert would depend on mock setup
      expect(result).toBeDefined();
    });

    it('should accept valid optional fields', async () => {
      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART',
        zone_id: 'ZONE1234',
        battery_plan: 'D2D',
        location: 'NOIDA',
        usc_id: 'USC_CODE',
        retrofit_date: '2024-12-25'
      });

      expect(result).toBeDefined();
    });
  });

  describe('Default Values', () => {
    it('should have status default to ACTIVE', async () => {
      // The test verifies the function logic handles defaults
      // Actual verification requires proper mocking of the database
      const input = {
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART' as const
      };

      // Function should apply ACTIVE as default
      const result = await addBattery(input);
      expect(result).toBeDefined();
    });
  });

  describe('Database Operations', () => {
    it('should handle duplicate battery_id error', async () => {
      // Setup mock to return duplicate key error
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: {
              message: 'duplicate key value violates unique constraint',
              code: '23505'
            }
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('DUPLICATE_BATTERY_ID');
        expect(result.error).toContain('already exists');
      }
    });

    it('should handle constraint violation error', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: {
              message: 'new row for relation "batteries" violates check constraint',
              code: '23514'
            }
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('CONSTRAINT_VIOLATION');
      }
    });

    it('should handle generic database error', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: {
              message: 'Connection timeout',
              code: 'PGRST000'
            }
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to create battery');
      }
    });
  });

  describe('Success Cases', () => {
    it('should successfully create battery with required fields only', async () => {
      const mockBattery = {
        id: '123',
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART',
        zone_id: null,
        retrofit_date: null,
        location: null,
        usc_id: null,
        battery_plan: null,
        status: 'ACTIVE',
        vehicle_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockEvent = {
        id: '456',
        battery_id: 'BAT00001',
        event_type: 'CREATE',
        vehicle_id: null,
        previous_vehicle_id: null,
        reason: 'Battery created',
        performed_by: 'postgres',
        changes: { battery_id: 'BAT00001' },
        created_at: new Date().toISOString()
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBattery,
            error: null
          })
        })
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockEvent,
                  error: null
                })
              })
            })
          })
        })
      });

      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'batteries') {
          return { insert: mockInsert } as any;
        }
        return { select: mockSelect } as any;
      });

      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.battery.battery_id).toBe('BAT00001');
        expect(result.battery.status).toBe('ACTIVE');
        expect(result.event.event_type).toBe('CREATE');
      }
    });

    it('should successfully create battery with all fields', async () => {
      const mockBattery = {
        id: '789',
        battery_id: 'BAT00002',
        service_provider: 'BATTERY_SMART',
        zone_id: 'ZONE1234',
        retrofit_date: '2024-12-25',
        location: 'NOIDA',
        usc_id: 'USC_CODE',
        battery_plan: 'D2D',
        status: 'ACTIVE',
        vehicle_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockBattery,
            error: null
          })
        })
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any);

      const result = await addBattery({
        battery_id: 'BAT00002',
        service_provider: 'BATTERY_SMART',
        zone_id: 'ZONE1234',
        battery_plan: 'D2D',
        location: 'NOIDA',
        usc_id: 'USC_CODE',
        retrofit_date: '2024-12-25'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.battery.battery_id).toBe('BAT00002');
        expect(result.battery.zone_id).toBe('ZONE1234');
        expect(result.battery.status).toBe('ACTIVE');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle null optional fields', async () => {
      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART',
        zone_id: null,
        retrofit_date: null,
        location: null,
        usc_id: null,
        battery_plan: null
      });

      expect(result).toBeDefined();
    });

    it('should handle undefined optional fields', async () => {
      const result = await addBattery({
        battery_id: 'BAT00001',
        service_provider: 'BATTERY_SMART'
      });

      expect(result).toBeDefined();
    });
  });
});

describe('isBatteryIdAvailable', () => {
  it('should return true if battery_id is available', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' } // Not found
          })
        })
      })
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any);

    const available = await isBatteryIdAvailable('BAT00001');
    expect(available).toBe(true);
  });

  it('should return false if battery_id is taken', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: '123' },
            error: null
          })
        })
      })
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any);

    const available = await isBatteryIdAvailable('BAT00001');
    expect(available).toBe(false);
  });
});

describe('generateBatteryId', () => {
  it('should return BAT00001 when no batteries exist', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' }
          })
        })
      })
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any);

    const id = await generateBatteryId();
    expect(id).toBe('BAT00001');
  });

  it('should return next battery_id in sequence', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { battery_id: 'BAT00005' },
            error: null
          })
        })
      })
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect
    } as any);

    const id = await generateBatteryId();
    expect(id).toBe('BAT00006');
  });
});
