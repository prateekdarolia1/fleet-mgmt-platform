-- Insert Missing Batteries from CL87 CSV (Records 46-83)
-- Generated: 2026-03-17
-- These 38 batteries exist in CL87.csv but were never created in the database
-- The cl87_sync.sql only did UPDATEs, not INSERTs

BEGIN;

-- Record 46: INT001 -> B637301
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B637301', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT001'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B637301');

-- Record 47: INT002 -> B801831
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B801831', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT002'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B801831');

-- Record 48: INT003 -> B799408
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B799408', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT003'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B799408');

-- Record 49: INT004 -> B706473
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B706473', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT004'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B706473');

-- Record 50: INT005 -> B879191
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B879191', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT005'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B879191');

-- Record 51: INT006 -> B879147
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B879147', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT006'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B879147');

-- Record 52: INT007 -> B809669
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B809669', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT007'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B809669');

-- Record 53: INT008 -> B818249
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B818249', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT008'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B818249');

-- Record 54: INT009 -> B652347
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B652347', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT009'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B652347');

-- Record 55: INT010 -> B566428
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B566428', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT010'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B566428');

-- Record 56: INT011 -> B731644
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B731644', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT011'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B731644');

-- Record 57: INT051 -> B705032
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B705032', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT051'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B705032');

-- Record 58: INT052 -> B706413
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B706413', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT052'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B706413');

-- Record 59: INT053 -> B762074
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B762074', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT053'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B762074');

-- Record 60: INT054 -> B654750
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B654750', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT054'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B654750');

-- Record 61: INT055 -> B902488
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B902488', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT055'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B902488');

-- Record 62: INT056 -> B706439
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B706439', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT056'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B706439');

-- Record 63: INT057 -> B799188
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B799188', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT057'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B799188');

-- Record 64: INT058 -> B754001
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B754001', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT058'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B754001');

-- Record 65: INT059 -> B888548
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B888548', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT059'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B888548');

-- Record 66: INT060 -> B478791
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B478791', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT060'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B478791');

-- Record 67: INT061 -> B607583
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B607583', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT061'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B607583');

-- Record 68: INT062 -> B677334
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B677334', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT062'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B677334');

-- Record 69: INT063 -> B818244
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B818244', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT063'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B818244');

-- Record 70: INT064 -> B817161
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B817161', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT064'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B817161');

-- Record 71: INT065 -> B683944
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B683944', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT065'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B683944');

-- Record 72: INT066 -> B733091
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B733091', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'INT066'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B733091');

-- Record 73: EVP007 -> B743638
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B743638', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP007'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B743638');

-- Record 74: EVP001 -> B854720
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B854720', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP001'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B854720');

-- Record 75: EVP002 -> B851649
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B851649', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP002'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B851649');

-- Record 76: EVP014 -> B753036
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B753036', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP014'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B753036');

-- Record 77: EVP013 -> B769718
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B769718', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP013'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B769718');

-- Record 78: EVP011 -> B738016
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B738016', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP011'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B738016');

-- Record 79: EVP033 -> B514898
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B514898', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP033'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B514898');

-- Record 80: EVP026 -> B918833
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B918833', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP026'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B918833');

-- Record 81: EVP012 -> B659079
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B659079', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP012'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B659079');

-- Record 82: EVP032 -> B472294
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B472294', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP032'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B472294');

-- Record 83: EVP027 -> B548842
INSERT INTO batteries (battery_id, status, vehicle_id, service_provider, created_at)
SELECT 'B548842', 'MAPPED', v.id, 'BATTERY_SMART', NOW()
FROM vehicles v
WHERE v.vehicle_number = 'EVP027'
  AND NOT EXISTS (SELECT 1 FROM batteries b WHERE b.battery_id = 'B548842');

COMMIT;

-- Verify: Should show 83 total batteries now
SELECT COUNT(*) as total_batteries FROM batteries;

-- Verify: Check that all 38 new batteries were created
SELECT battery_id, vehicle_id, status FROM batteries
WHERE battery_id IN ('B637301','B801831','B799408','B706473','B879191','B879147','B809669','B818249','B652347','B566428','B731644','B705032','B706413','B762074','B654750','B902488','B706439','B799188','B754001','B888548','B478791','B607583','B677334','B818244','B817161','B683944','B733091','B743638','B854720','B851649','B753036','B769718','B738016','B514898','B918833','B659079','B472294','B548842')
ORDER BY battery_id;
