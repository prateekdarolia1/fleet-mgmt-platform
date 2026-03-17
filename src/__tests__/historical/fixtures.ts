/**
 * Test Fixtures for Historical Data Management System
 */

import type { DataSource, DataImportBatch, RetroactiveEvent } from '@/types/historical';

// ============================================================================
// SAMPLE CSV DATA
// ============================================================================

export const SAMPLE_CL87_CSV = `S.No,Make & Model,Speed Type,Chassis Number,Vehicle ID,Driver ID,Battery ID,Deployment Date,Zone ID,Zone Name,USC ID
1,Hero Electric Optima,High Speed,MH01AB1234,VH001,DR001,BT001,2024-01-15,Z001,Zone A,USC001
2,Hero Electric Flash,Low Speed,MH01CD5678,VH002,DR002,BT002,2024-01-16,Z001,Zone A,USC002
3,Ampere Magnus,High Speed,MH01EF9012,VH003,DR003,BT003,2024-01-17,Z002,Zone B,USC003
4,Okaya Faast,Low Speed,MH01GH3456,VH004,DR004,BT004,2024-01-18,Z002,Zone B,USC004`;

export const SAMPLE_CL87_CSV_WITH_ISSUES = `S.No,Make & Model,Speed Type,Chassis Number,Vehicle ID,Driver ID,Battery ID,Deployment Date,Zone ID,Zone Name,USC ID
1,Hero Electric Optima,High Speed,MH01AB1234,VH001,DR001,BT001,invalid-date,Z001,Zone A,USC001
2,Hero Electric Flash,Low Speed,,VH002,,BT002,2024-01-16,Z001,Zone A,
3,Ampere Magnus,High Speed,MH01EF9012,,,BT003,2024-01-17,Z002,Zone B,USC003
4,Okaya Faast,Low Speed,MH01GH3456,VH004,DR004,BT004,,Z002,Zone B,USC004`;

export const SAMPLE_PAYMENT_CSV = `rider_id,rider_name,payment_date,amount,week_number,due_date
DR001,John Doe,2024-01-22,1500,1,2024-01-22
DR001,John Doe,2024-01-29,1500,2,2024-01-29
DR002,Jane Smith,2024-01-22,1500,1,2024-01-22
DR002,Jane Smith,2024-01-29,1500,2,2024-01-29`;

// ============================================================================
// SAMPLE RIDER DATA
// ============================================================================

export const SAMPLE_RIDERS = [
  {
    rider_id: 'DR001',
    name: 'John Doe',
    phone: '9876543210',
    email: 'john@example.com',
    status: 'active' as const,
    vehicle_assigned: 'VH001',
    battery_smart_id: 'USC001',
    onboard_date: '2024-01-10',
    deboard_date: null,
    join_date: '2024-01-10',
    rental_plan: 'weekly' as const,
    address: '123 Main St',
    license_document: true,
    aadhar_document: true,
    agreement_document: true,
  },
  {
    rider_id: 'DR002',
    name: 'Jane Smith',
    phone: '9876543211',
    email: 'jane@example.com',
    status: 'active' as const,
    vehicle_assigned: 'VH002',
    battery_smart_id: 'USC002',
    onboard_date: '2024-01-11',
    deboard_date: null,
    join_date: '2024-01-11',
    rental_plan: 'weekly' as const,
    address: '456 Oak Ave',
    license_document: true,
    aadhar_document: true,
    agreement_document: true,
  },
  {
    rider_id: 'DR003',
    name: 'Bob Johnson',
    phone: '9876543212',
    email: 'bob@example.com',
    status: 'deboarded' as const,
    vehicle_assigned: null,
    battery_smart_id: null,
    onboard_date: '2023-06-01',
    deboard_date: '2024-01-15',
    join_date: '2023-06-01',
    rental_plan: 'weekly' as const,
    address: '789 Pine Rd',
    license_document: true,
    aadhar_document: true,
    agreement_document: true,
  },
];

// ============================================================================
// SAMPLE VEHICLE DATA
// ============================================================================

export const SAMPLE_VEHICLES = [
  {
    vehicle_number: 'VH001',
    make: 'Hero Electric',
    model: 'Optima',
    color: 'Black',
    chassis_number: 'MH01AB1234',
    motor_serial_number: 'MSN001',
    status: 'Deployed' as const,
    rider_id: 'DR001',
    rental_start_date: '2024-01-15',
  },
  {
    vehicle_number: 'VH002',
    make: 'Hero Electric',
    model: 'Flash',
    color: 'White',
    chassis_number: 'MH01CD5678',
    motor_serial_number: 'MSN002',
    status: 'Deployed' as const,
    rider_id: 'DR002',
    rental_start_date: '2024-01-16',
  },
  {
    vehicle_number: 'VH003',
    make: 'Ampere',
    model: 'Magnus',
    color: 'Blue',
    chassis_number: 'MH01EF9012',
    motor_serial_number: 'MSN003',
    status: 'Ready for Deployment' as const,
    rider_id: null,
    rental_start_date: null,
  },
];

// ============================================================================
// SAMPLE BATTERY DATA
// ============================================================================

export const SAMPLE_BATTERIES = [
  {
    battery_id: 'BT001',
    battery_smart_id: 'USC001',
    status: 'MAPPED' as const,
    vehicle_id: 'VH001',
    service_provider: 'BATTERY_SMART' as const,
    retrofit_date: '2024-01-15',
  },
  {
    battery_id: 'BT002',
    battery_smart_id: 'USC002',
    status: 'MAPPED' as const,
    vehicle_id: 'VH002',
    service_provider: 'BATTERY_SMART' as const,
    retrofit_date: '2024-01-16',
  },
  {
    battery_id: 'BT003',
    battery_smart_id: 'USC003',
    status: 'UNMAPPED' as const,
    vehicle_id: null,
    service_provider: 'BATTERY_SMART' as const,
    retrofit_date: '2024-01-17',
  },
];

// ============================================================================
// SAMPLE IMPORT BATCHES
// ============================================================================

export const SAMPLE_IMPORT_BATCH: DataImportBatch = {
  id: 'batch-001',
  batch_name: 'CL87 Import 2024-01-20',
  source_file: 'CL87_20240120.csv',
  import_date: '2024-01-20T10:00:00Z',
  data_period_start: '2024-01-01',
  data_period_end: '2024-01-20',
  records_total: 100,
  records_created: 45,
  records_updated: 50,
  records_skipped: 5,
  defaults_applied: {},
  warnings: ['5 records had missing dates'],
  status: 'completed',
  imported_by: 'admin@example.com',
  notes: 'Initial historical import',
  created_at: '2024-01-20T10:00:00Z',
  updated_at: '2024-01-20T10:05:00Z',
};

// ============================================================================
// SAMPLE RETROACTIVE EVENTS
// ============================================================================

export const SAMPLE_RETROACTIVE_EVENTS: RetroactiveEvent[] = [
  {
    id: 'event-001',
    entity_type: 'rider',
    entity_id: 'DR001',
    event_type: 'ONBOARD',
    effective_date: '2024-01-10T00:00:00Z',
    recorded_date: '2024-01-20T10:00:00Z',
    event_data: {
      vehicle_assigned: 'VH001',
      battery_smart_id: 'USC001',
    },
    source: 'CL87_CSV',
    confidence: 0.90,
    notes: 'Estimated from deployment date',
    import_batch_id: 'batch-001',
    created_at: '2024-01-20T10:00:00Z',
  },
  {
    id: 'event-002',
    entity_type: 'vehicle',
    entity_id: 'VH001',
    event_type: 'DEPLOY',
    effective_date: '2024-01-15T00:00:00Z',
    recorded_date: '2024-01-20T10:00:00Z',
    event_data: {
      rider_id: 'DR001',
      battery_id: 'BT001',
    },
    source: 'CL87_CSV',
    confidence: 1.00,
    notes: null,
    import_batch_id: 'batch-001',
    created_at: '2024-01-20T10:00:00Z',
  },
];

// ============================================================================
// SAMPLE RECONCILIATION MATCHES
// ============================================================================

export const SAMPLE_RECONCILIATION_MATCHES = [
  {
    csvRecord: {
      rider_id: 'DR001',
      name: 'John Doe',
      phone: '9876543210',
      vehicle_assigned: 'VH001',
    },
    dbRecord: {
      rider_id: 'DR001',
      name: 'John Doe',
      phone: '9876543210',
      vehicle_assigned: 'VH001',
    },
    category: 'EXACT_MATCH' as const,
  },
  {
    csvRecord: {
      rider_id: 'DR002',
      name: 'Jane Smith',
      phone: '9876543211',
      vehicle_assigned: 'VH002',
    },
    dbRecord: {
      rider_id: 'DR002',
      name: 'Jane A. Smith',
      phone: '9876543211',
      vehicle_assigned: 'VH001',
    },
    category: 'CONFLICT' as const,
    conflicts: [
      {
        field: 'name',
        csvValue: 'Jane Smith',
        dbValue: 'Jane A. Smith',
        resolution: 'csv' as const,
      },
      {
        field: 'vehicle_assigned',
        csvValue: 'VH002',
        dbValue: 'VH001',
        resolution: 'csv' as const,
      },
    ],
  },
  {
    csvRecord: {
      rider_id: 'DR005',
      name: 'New Rider',
      phone: '9876543215',
      vehicle_assigned: 'VH005',
    },
    dbRecord: null,
    category: 'NEW_RECORD' as const,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createMockSupabaseClient() {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-001' } }, error: null }),
    },
  };
}

export function createMockCSVFile(content: string, name: string = 'test.csv'): File {
  return new File([content], name, { type: 'text/csv' });
}
