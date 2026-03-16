-- CL87 Battery Smart Data Sync SQL
-- Generated: 2026-03-16
-- Total mappings: 83
-- CSV data takes PRECEDENCE over existing data
--
-- Run this in Supabase SQL Editor
-- ========================================

BEGIN;

-- Clear existing mappings first (optional - uncomment if needed)
-- UPDATE vehicles SET battery_id = NULL, rider_id = NULL WHERE vehicle_number LIKE ANY(ARRAY['EVP%', 'INT%']);
-- UPDATE batteries SET vehicle_id = NULL, status = 'UNMAPPED' WHERE battery_id LIKE 'B%';


-- Record 1: EVP020 -> Driver: D146301 -> Battery: B708523
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B708523'),
  rider_id = 'D146301'
WHERE vehicle_number = 'EVP020';

UPDATE riders SET
  vehicle_assigned = 'EVP020'
WHERE rider_id = 'D146301';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP020'),
  status = 'MAPPED'
WHERE battery_id = 'B708523';

-- Record 2: LCS5BAB55N9000957 -> Driver: D231228 -> Battery: B654748
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B654748'),
  rider_id = 'D231228'
WHERE vehicle_number = 'LCS5BAB55N9000957';

UPDATE riders SET
  vehicle_assigned = 'LCS5BAB55N9000957'
WHERE rider_id = 'D231228';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'LCS5BAB55N9000957'),
  status = 'MAPPED'
WHERE battery_id = 'B654748';

-- Record 3: LCS5BAB55N9000974 -> Driver: D231235 -> Battery: B848143
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B848143'),
  rider_id = 'D231235'
WHERE vehicle_number = 'LCS5BAB55N9000974';

UPDATE riders SET
  vehicle_assigned = 'LCS5BAB55N9000974'
WHERE rider_id = 'D231235';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'LCS5BAB55N9000974'),
  status = 'MAPPED'
WHERE battery_id = 'B848143';

-- Record 4: EVP010 -> Driver: D231360 -> Battery: B741181
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B741181'),
  rider_id = 'D231360'
WHERE vehicle_number = 'EVP010';

UPDATE riders SET
  vehicle_assigned = 'EVP010'
WHERE rider_id = 'D231360';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP010'),
  status = 'MAPPED'
WHERE battery_id = 'B741181';

-- Record 5: EVP004 -> Driver: D231361 -> Battery: B493913
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B493913'),
  rider_id = 'D231361'
WHERE vehicle_number = 'EVP004';

UPDATE riders SET
  vehicle_assigned = 'EVP004'
WHERE rider_id = 'D231361';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP004'),
  status = 'MAPPED'
WHERE battery_id = 'B493913';

-- Record 6: EVP023 -> Driver: D231362 -> Battery: B237003
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B237003'),
  rider_id = 'D231362'
WHERE vehicle_number = 'EVP023';

UPDATE riders SET
  vehicle_assigned = 'EVP023'
WHERE rider_id = 'D231362';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP023'),
  status = 'MAPPED'
WHERE battery_id = 'B237003';

-- Record 7: INT038 -> Driver: D231458 -> Battery: B890806
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B890806'),
  rider_id = 'D231458'
WHERE vehicle_number = 'INT038';

UPDATE riders SET
  vehicle_assigned = 'INT038'
WHERE rider_id = 'D231458';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT038'),
  status = 'MAPPED'
WHERE battery_id = 'B890806';

-- Record 8: INT039 -> Driver: D231459 -> Battery: B735553
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B735553'),
  rider_id = 'D231459'
WHERE vehicle_number = 'INT039';

UPDATE riders SET
  vehicle_assigned = 'INT039'
WHERE rider_id = 'D231459';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT039'),
  status = 'MAPPED'
WHERE battery_id = 'B735553';

-- Record 9: INT040 -> Driver: D231460 -> Battery: B849072
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B849072'),
  rider_id = 'D231460'
WHERE vehicle_number = 'INT040';

UPDATE riders SET
  vehicle_assigned = 'INT040'
WHERE rider_id = 'D231460';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT040'),
  status = 'MAPPED'
WHERE battery_id = 'B849072';

-- Record 10: INT041 -> Driver: D231461 -> Battery: B890733
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B890733'),
  rider_id = 'D231461'
WHERE vehicle_number = 'INT041';

UPDATE riders SET
  vehicle_assigned = 'INT041'
WHERE rider_id = 'D231461';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT041'),
  status = 'MAPPED'
WHERE battery_id = 'B890733';

-- Record 11: INT042 -> Driver: D231462 -> Battery: B889080
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B889080'),
  rider_id = 'D231462'
WHERE vehicle_number = 'INT042';

UPDATE riders SET
  vehicle_assigned = 'INT042'
WHERE rider_id = 'D231462';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT042'),
  status = 'MAPPED'
WHERE battery_id = 'B889080';

-- Record 12: INT043 -> Driver: D231463 -> Battery: B890312
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B890312'),
  rider_id = 'D231463'
WHERE vehicle_number = 'INT043';

UPDATE riders SET
  vehicle_assigned = 'INT043'
WHERE rider_id = 'D231463';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT043'),
  status = 'MAPPED'
WHERE battery_id = 'B890312';

-- Record 13: INT044 -> Driver: D231464 -> Battery: B890957
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B890957'),
  rider_id = 'D231464'
WHERE vehicle_number = 'INT044';

UPDATE riders SET
  vehicle_assigned = 'INT044'
WHERE rider_id = 'D231464';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT044'),
  status = 'MAPPED'
WHERE battery_id = 'B890957';

-- Record 14: INT045 -> Driver: D231465 -> Battery: B890166
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B890166'),
  rider_id = 'D231465'
WHERE vehicle_number = 'INT045';

UPDATE riders SET
  vehicle_assigned = 'INT045'
WHERE rider_id = 'D231465';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT045'),
  status = 'MAPPED'
WHERE battery_id = 'B890166';

-- Record 15: INT046 -> Driver: D231466 -> Battery: B891312
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B891312'),
  rider_id = 'D231466'
WHERE vehicle_number = 'INT046';

UPDATE riders SET
  vehicle_assigned = 'INT046'
WHERE rider_id = 'D231466';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT046'),
  status = 'MAPPED'
WHERE battery_id = 'B891312';

-- Record 16: INT047 -> Driver: D231467 -> Battery: B888572
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B888572'),
  rider_id = 'D231467'
WHERE vehicle_number = 'INT047';

UPDATE riders SET
  vehicle_assigned = 'INT047'
WHERE rider_id = 'D231467';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT047'),
  status = 'MAPPED'
WHERE battery_id = 'B888572';

-- Record 17: INT048 -> Driver: D231468 -> Battery: B890878
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B890878'),
  rider_id = 'D231468'
WHERE vehicle_number = 'INT048';

UPDATE riders SET
  vehicle_assigned = 'INT048'
WHERE rider_id = 'D231468';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT048'),
  status = 'MAPPED'
WHERE battery_id = 'B890878';

-- Record 18: INT049 -> Driver: D231469 -> Battery: B884167
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B884167'),
  rider_id = 'D231469'
WHERE vehicle_number = 'INT049';

UPDATE riders SET
  vehicle_assigned = 'INT049'
WHERE rider_id = 'D231469';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT049'),
  status = 'MAPPED'
WHERE battery_id = 'B884167';

-- Record 19: INT050 -> Driver: D231470 -> Battery: B890241
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B890241'),
  rider_id = 'D231470'
WHERE vehicle_number = 'INT050';

UPDATE riders SET
  vehicle_assigned = 'INT050'
WHERE rider_id = 'D231470';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT050'),
  status = 'MAPPED'
WHERE battery_id = 'B890241';

-- Record 20: INT028 -> Driver: D231518 -> Battery: B405298
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B405298'),
  rider_id = 'D231518'
WHERE vehicle_number = 'INT028';

UPDATE riders SET
  vehicle_assigned = 'INT028'
WHERE rider_id = 'D231518';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT028'),
  status = 'MAPPED'
WHERE battery_id = 'B405298';

-- Record 21: INT029 -> Driver: D231519 -> Battery: B350245
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B350245'),
  rider_id = 'D231519'
WHERE vehicle_number = 'INT029';

UPDATE riders SET
  vehicle_assigned = 'INT029'
WHERE rider_id = 'D231519';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT029'),
  status = 'MAPPED'
WHERE battery_id = 'B350245';

-- Record 22: INT030 -> Driver: D231520 -> Battery: B424728
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B424728'),
  rider_id = 'D231520'
WHERE vehicle_number = 'INT030';

UPDATE riders SET
  vehicle_assigned = 'INT030'
WHERE rider_id = 'D231520';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT030'),
  status = 'MAPPED'
WHERE battery_id = 'B424728';

-- Record 23: INT031 -> Driver: D231521 -> Battery: B886033
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B886033'),
  rider_id = 'D231521'
WHERE vehicle_number = 'INT031';

UPDATE riders SET
  vehicle_assigned = 'INT031'
WHERE rider_id = 'D231521';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT031'),
  status = 'MAPPED'
WHERE battery_id = 'B886033';

-- Record 24: INT032 -> Driver: D231522 -> Battery: B886382
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B886382'),
  rider_id = 'D231522'
WHERE vehicle_number = 'INT032';

UPDATE riders SET
  vehicle_assigned = 'INT032'
WHERE rider_id = 'D231522';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT032'),
  status = 'MAPPED'
WHERE battery_id = 'B886382';

-- Record 25: INT033 -> Driver: D231523 -> Battery: B735844
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B735844'),
  rider_id = 'D231523'
WHERE vehicle_number = 'INT033';

UPDATE riders SET
  vehicle_assigned = 'INT033'
WHERE rider_id = 'D231523';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT033'),
  status = 'MAPPED'
WHERE battery_id = 'B735844';

-- Record 26: INT034 -> Driver: D231524 -> Battery: B552182
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B552182'),
  rider_id = 'D231524'
WHERE vehicle_number = 'INT034';

UPDATE riders SET
  vehicle_assigned = 'INT034'
WHERE rider_id = 'D231524';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT034'),
  status = 'MAPPED'
WHERE battery_id = 'B552182';

-- Record 27: INT035 -> Driver: D231525 -> Battery: B572363
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B572363'),
  rider_id = 'D231525'
WHERE vehicle_number = 'INT035';

UPDATE riders SET
  vehicle_assigned = 'INT035'
WHERE rider_id = 'D231525';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT035'),
  status = 'MAPPED'
WHERE battery_id = 'B572363';

-- Record 28: INT036 -> Driver: D231526 -> Battery: B714345
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B714345'),
  rider_id = 'D231526'
WHERE vehicle_number = 'INT036';

UPDATE riders SET
  vehicle_assigned = 'INT036'
WHERE rider_id = 'D231526';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT036'),
  status = 'MAPPED'
WHERE battery_id = 'B714345';

-- Record 29: INT037 -> Driver: D231527 -> Battery: B602848
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B602848'),
  rider_id = 'D231527'
WHERE vehicle_number = 'INT037';

UPDATE riders SET
  vehicle_assigned = 'INT037'
WHERE rider_id = 'D231527';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT037'),
  status = 'MAPPED'
WHERE battery_id = 'B602848';

-- Record 30: INT025 -> Driver: D231528 -> Battery: B453495
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B453495'),
  rider_id = 'D231528'
WHERE vehicle_number = 'INT025';

UPDATE riders SET
  vehicle_assigned = 'INT025'
WHERE rider_id = 'D231528';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT025'),
  status = 'MAPPED'
WHERE battery_id = 'B453495';

-- Record 31: INT026 -> Driver: D231529 -> Battery: B558724
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B558724'),
  rider_id = 'D231529'
WHERE vehicle_number = 'INT026';

UPDATE riders SET
  vehicle_assigned = 'INT026'
WHERE rider_id = 'D231529';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT026'),
  status = 'MAPPED'
WHERE battery_id = 'B558724';

-- Record 32: INT027 -> Driver: D231530 -> Battery: B475304
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B475304'),
  rider_id = 'D231530'
WHERE vehicle_number = 'INT027';

UPDATE riders SET
  vehicle_assigned = 'INT027'
WHERE rider_id = 'D231530';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT027'),
  status = 'MAPPED'
WHERE battery_id = 'B475304';

-- Record 33: INT012 -> Driver: D231654 -> Battery: B566275
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B566275'),
  rider_id = 'D231654'
WHERE vehicle_number = 'INT012';

UPDATE riders SET
  vehicle_assigned = 'INT012'
WHERE rider_id = 'D231654';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT012'),
  status = 'MAPPED'
WHERE battery_id = 'B566275';

-- Record 34: INT013 -> Driver: D231655 -> Battery: B887040
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B887040'),
  rider_id = 'D231655'
WHERE vehicle_number = 'INT013';

UPDATE riders SET
  vehicle_assigned = 'INT013'
WHERE rider_id = 'D231655';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT013'),
  status = 'MAPPED'
WHERE battery_id = 'B887040';

-- Record 35: INT014 -> Driver: D231656 -> Battery: B492232
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B492232'),
  rider_id = 'D231656'
WHERE vehicle_number = 'INT014';

UPDATE riders SET
  vehicle_assigned = 'INT014'
WHERE rider_id = 'D231656';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT014'),
  status = 'MAPPED'
WHERE battery_id = 'B492232';

-- Record 36: INT015 -> Driver: D231657 -> Battery: B480414
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B480414'),
  rider_id = 'D231657'
WHERE vehicle_number = 'INT015';

UPDATE riders SET
  vehicle_assigned = 'INT015'
WHERE rider_id = 'D231657';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT015'),
  status = 'MAPPED'
WHERE battery_id = 'B480414';

-- Record 37: INT016 -> Driver: D231658 -> Battery: B725313
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B725313'),
  rider_id = 'D231658'
WHERE vehicle_number = 'INT016';

UPDATE riders SET
  vehicle_assigned = 'INT016'
WHERE rider_id = 'D231658';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT016'),
  status = 'MAPPED'
WHERE battery_id = 'B725313';

-- Record 38: INT017 -> Driver: D231659 -> Battery: B677498
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B677498'),
  rider_id = 'D231659'
WHERE vehicle_number = 'INT017';

UPDATE riders SET
  vehicle_assigned = 'INT017'
WHERE rider_id = 'D231659';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT017'),
  status = 'MAPPED'
WHERE battery_id = 'B677498';

-- Record 39: INT018 -> Driver: D231660 -> Battery: B563817
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B563817'),
  rider_id = 'D231660'
WHERE vehicle_number = 'INT018';

UPDATE riders SET
  vehicle_assigned = 'INT018'
WHERE rider_id = 'D231660';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT018'),
  status = 'MAPPED'
WHERE battery_id = 'B563817';

-- Record 40: INT019 -> Driver: D231661 -> Battery: B59616
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B59616'),
  rider_id = 'D231661'
WHERE vehicle_number = 'INT019';

UPDATE riders SET
  vehicle_assigned = 'INT019'
WHERE rider_id = 'D231661';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT019'),
  status = 'MAPPED'
WHERE battery_id = 'B59616';

-- Record 41: INT020 -> Driver: D231662 -> Battery: B843265
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B843265'),
  rider_id = 'D231662'
WHERE vehicle_number = 'INT020';

UPDATE riders SET
  vehicle_assigned = 'INT020'
WHERE rider_id = 'D231662';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT020'),
  status = 'MAPPED'
WHERE battery_id = 'B843265';

-- Record 42: INT021 -> Driver: D231663 -> Battery: B661078
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B661078'),
  rider_id = 'D231663'
WHERE vehicle_number = 'INT021';

UPDATE riders SET
  vehicle_assigned = 'INT021'
WHERE rider_id = 'D231663';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT021'),
  status = 'MAPPED'
WHERE battery_id = 'B661078';

-- Record 43: INT022 -> Driver: D231664 -> Battery: B571528
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B571528'),
  rider_id = 'D231664'
WHERE vehicle_number = 'INT022';

UPDATE riders SET
  vehicle_assigned = 'INT022'
WHERE rider_id = 'D231664';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT022'),
  status = 'MAPPED'
WHERE battery_id = 'B571528';

-- Record 44: INT023 -> Driver: D231665 -> Battery: B557459
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B557459'),
  rider_id = 'D231665'
WHERE vehicle_number = 'INT023';

UPDATE riders SET
  vehicle_assigned = 'INT023'
WHERE rider_id = 'D231665';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT023'),
  status = 'MAPPED'
WHERE battery_id = 'B557459';

-- Record 45: INT024 -> Driver: D231666 -> Battery: B886807
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B886807'),
  rider_id = 'D231666'
WHERE vehicle_number = 'INT024';

UPDATE riders SET
  vehicle_assigned = 'INT024'
WHERE rider_id = 'D231666';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT024'),
  status = 'MAPPED'
WHERE battery_id = 'B886807';

-- Record 46: INT001 -> Driver: D231747 -> Battery: B637301
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B637301'),
  rider_id = 'D231747'
WHERE vehicle_number = 'INT001';

UPDATE riders SET
  vehicle_assigned = 'INT001'
WHERE rider_id = 'D231747';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT001'),
  status = 'MAPPED'
WHERE battery_id = 'B637301';

-- Record 47: INT002 -> Driver: D231748 -> Battery: B801831
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B801831'),
  rider_id = 'D231748'
WHERE vehicle_number = 'INT002';

UPDATE riders SET
  vehicle_assigned = 'INT002'
WHERE rider_id = 'D231748';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT002'),
  status = 'MAPPED'
WHERE battery_id = 'B801831';

-- Record 48: INT003 -> Driver: D231749 -> Battery: B799408
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B799408'),
  rider_id = 'D231749'
WHERE vehicle_number = 'INT003';

UPDATE riders SET
  vehicle_assigned = 'INT003'
WHERE rider_id = 'D231749';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT003'),
  status = 'MAPPED'
WHERE battery_id = 'B799408';

-- Record 49: INT004 -> Driver: D231750 -> Battery: B706473
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B706473'),
  rider_id = 'D231750'
WHERE vehicle_number = 'INT004';

UPDATE riders SET
  vehicle_assigned = 'INT004'
WHERE rider_id = 'D231750';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT004'),
  status = 'MAPPED'
WHERE battery_id = 'B706473';

-- Record 50: INT005 -> Driver: D231751 -> Battery: B879191
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B879191'),
  rider_id = 'D231751'
WHERE vehicle_number = 'INT005';

UPDATE riders SET
  vehicle_assigned = 'INT005'
WHERE rider_id = 'D231751';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT005'),
  status = 'MAPPED'
WHERE battery_id = 'B879191';

-- Record 51: INT006 -> Driver: D231752 -> Battery: B879147
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B879147'),
  rider_id = 'D231752'
WHERE vehicle_number = 'INT006';

UPDATE riders SET
  vehicle_assigned = 'INT006'
WHERE rider_id = 'D231752';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT006'),
  status = 'MAPPED'
WHERE battery_id = 'B879147';

-- Record 52: INT007 -> Driver: D231753 -> Battery: B809669
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B809669'),
  rider_id = 'D231753'
WHERE vehicle_number = 'INT007';

UPDATE riders SET
  vehicle_assigned = 'INT007'
WHERE rider_id = 'D231753';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT007'),
  status = 'MAPPED'
WHERE battery_id = 'B809669';

-- Record 53: INT008 -> Driver: D231754 -> Battery: B818249
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B818249'),
  rider_id = 'D231754'
WHERE vehicle_number = 'INT008';

UPDATE riders SET
  vehicle_assigned = 'INT008'
WHERE rider_id = 'D231754';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT008'),
  status = 'MAPPED'
WHERE battery_id = 'B818249';

-- Record 54: INT009 -> Driver: D231755 -> Battery: B652347
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B652347'),
  rider_id = 'D231755'
WHERE vehicle_number = 'INT009';

UPDATE riders SET
  vehicle_assigned = 'INT009'
WHERE rider_id = 'D231755';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT009'),
  status = 'MAPPED'
WHERE battery_id = 'B652347';

-- Record 55: INT010 -> Driver: D231756 -> Battery: B566428
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B566428'),
  rider_id = 'D231756'
WHERE vehicle_number = 'INT010';

UPDATE riders SET
  vehicle_assigned = 'INT010'
WHERE rider_id = 'D231756';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT010'),
  status = 'MAPPED'
WHERE battery_id = 'B566428';

-- Record 56: INT011 -> Driver: D231757 -> Battery: B731644
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B731644'),
  rider_id = 'D231757'
WHERE vehicle_number = 'INT011';

UPDATE riders SET
  vehicle_assigned = 'INT011'
WHERE rider_id = 'D231757';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT011'),
  status = 'MAPPED'
WHERE battery_id = 'B731644';

-- Record 57: INT051 -> Driver: D241987 -> Battery: B705032
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B705032'),
  rider_id = 'D241987'
WHERE vehicle_number = 'INT051';

UPDATE riders SET
  vehicle_assigned = 'INT051'
WHERE rider_id = 'D241987';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT051'),
  status = 'MAPPED'
WHERE battery_id = 'B705032';

-- Record 58: INT052 -> Driver: D241988 -> Battery: B706413
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B706413'),
  rider_id = 'D241988'
WHERE vehicle_number = 'INT052';

UPDATE riders SET
  vehicle_assigned = 'INT052'
WHERE rider_id = 'D241988';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT052'),
  status = 'MAPPED'
WHERE battery_id = 'B706413';

-- Record 59: INT053 -> Driver: D241989 -> Battery: B762074
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B762074'),
  rider_id = 'D241989'
WHERE vehicle_number = 'INT053';

UPDATE riders SET
  vehicle_assigned = 'INT053'
WHERE rider_id = 'D241989';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT053'),
  status = 'MAPPED'
WHERE battery_id = 'B762074';

-- Record 60: INT054 -> Driver: D241990 -> Battery: B654750
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B654750'),
  rider_id = 'D241990'
WHERE vehicle_number = 'INT054';

UPDATE riders SET
  vehicle_assigned = 'INT054'
WHERE rider_id = 'D241990';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT054'),
  status = 'MAPPED'
WHERE battery_id = 'B654750';

-- Record 61: INT055 -> Driver: D241991 -> Battery: B902488
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B902488'),
  rider_id = 'D241991'
WHERE vehicle_number = 'INT055';

UPDATE riders SET
  vehicle_assigned = 'INT055'
WHERE rider_id = 'D241991';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT055'),
  status = 'MAPPED'
WHERE battery_id = 'B902488';

-- Record 62: INT056 -> Driver: D241992 -> Battery: B706439
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B706439'),
  rider_id = 'D241992'
WHERE vehicle_number = 'INT056';

UPDATE riders SET
  vehicle_assigned = 'INT056'
WHERE rider_id = 'D241992';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT056'),
  status = 'MAPPED'
WHERE battery_id = 'B706439';

-- Record 63: INT057 -> Driver: D241993 -> Battery: B799188
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B799188'),
  rider_id = 'D241993'
WHERE vehicle_number = 'INT057';

UPDATE riders SET
  vehicle_assigned = 'INT057'
WHERE rider_id = 'D241993';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT057'),
  status = 'MAPPED'
WHERE battery_id = 'B799188';

-- Record 64: INT058 -> Driver: D241994 -> Battery: B754001
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B754001'),
  rider_id = 'D241994'
WHERE vehicle_number = 'INT058';

UPDATE riders SET
  vehicle_assigned = 'INT058'
WHERE rider_id = 'D241994';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT058'),
  status = 'MAPPED'
WHERE battery_id = 'B754001';

-- Record 65: INT059 -> Driver: D241995 -> Battery: B888548
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B888548'),
  rider_id = 'D241995'
WHERE vehicle_number = 'INT059';

UPDATE riders SET
  vehicle_assigned = 'INT059'
WHERE rider_id = 'D241995';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT059'),
  status = 'MAPPED'
WHERE battery_id = 'B888548';

-- Record 66: INT060 -> Driver: D241996 -> Battery: B478791
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B478791'),
  rider_id = 'D241996'
WHERE vehicle_number = 'INT060';

UPDATE riders SET
  vehicle_assigned = 'INT060'
WHERE rider_id = 'D241996';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT060'),
  status = 'MAPPED'
WHERE battery_id = 'B478791';

-- Record 67: INT061 -> Driver: D241997 -> Battery: B607583
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B607583'),
  rider_id = 'D241997'
WHERE vehicle_number = 'INT061';

UPDATE riders SET
  vehicle_assigned = 'INT061'
WHERE rider_id = 'D241997';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT061'),
  status = 'MAPPED'
WHERE battery_id = 'B607583';

-- Record 68: INT062 -> Driver: D241998 -> Battery: B677334
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B677334'),
  rider_id = 'D241998'
WHERE vehicle_number = 'INT062';

UPDATE riders SET
  vehicle_assigned = 'INT062'
WHERE rider_id = 'D241998';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT062'),
  status = 'MAPPED'
WHERE battery_id = 'B677334';

-- Record 69: INT063 -> Driver: D241999 -> Battery: B818244
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B818244'),
  rider_id = 'D241999'
WHERE vehicle_number = 'INT063';

UPDATE riders SET
  vehicle_assigned = 'INT063'
WHERE rider_id = 'D241999';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT063'),
  status = 'MAPPED'
WHERE battery_id = 'B818244';

-- Record 70: INT064 -> Driver: D242000 -> Battery: B817161
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B817161'),
  rider_id = 'D242000'
WHERE vehicle_number = 'INT064';

UPDATE riders SET
  vehicle_assigned = 'INT064'
WHERE rider_id = 'D242000';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT064'),
  status = 'MAPPED'
WHERE battery_id = 'B817161';

-- Record 71: INT065 -> Driver: D242001 -> Battery: B683944
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B683944'),
  rider_id = 'D242001'
WHERE vehicle_number = 'INT065';

UPDATE riders SET
  vehicle_assigned = 'INT065'
WHERE rider_id = 'D242001';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT065'),
  status = 'MAPPED'
WHERE battery_id = 'B683944';

-- Record 72: INT066 -> Driver: D242002 -> Battery: B733091
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B733091'),
  rider_id = 'D242002'
WHERE vehicle_number = 'INT066';

UPDATE riders SET
  vehicle_assigned = 'INT066'
WHERE rider_id = 'D242002';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'INT066'),
  status = 'MAPPED'
WHERE battery_id = 'B733091';

-- Record 73: EVP007 -> Driver: D252702 -> Battery: B743638
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B743638'),
  rider_id = 'D252702'
WHERE vehicle_number = 'EVP007';

UPDATE riders SET
  vehicle_assigned = 'EVP007'
WHERE rider_id = 'D252702';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP007'),
  status = 'MAPPED'
WHERE battery_id = 'B743638';

-- Record 74: EVP001 -> Driver: D252703 -> Battery: B854720
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B854720'),
  rider_id = 'D252703'
WHERE vehicle_number = 'EVP001';

UPDATE riders SET
  vehicle_assigned = 'EVP001'
WHERE rider_id = 'D252703';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP001'),
  status = 'MAPPED'
WHERE battery_id = 'B854720';

-- Record 75: EVP002 -> Driver: D252704 -> Battery: B851649
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B851649'),
  rider_id = 'D252704'
WHERE vehicle_number = 'EVP002';

UPDATE riders SET
  vehicle_assigned = 'EVP002'
WHERE rider_id = 'D252704';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP002'),
  status = 'MAPPED'
WHERE battery_id = 'B851649';

-- Record 76: EVP014 -> Driver: D252705 -> Battery: B753036
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B753036'),
  rider_id = 'D252705'
WHERE vehicle_number = 'EVP014';

UPDATE riders SET
  vehicle_assigned = 'EVP014'
WHERE rider_id = 'D252705';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP014'),
  status = 'MAPPED'
WHERE battery_id = 'B753036';

-- Record 77: EVP013 -> Driver: D252706 -> Battery: B769718
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B769718'),
  rider_id = 'D252706'
WHERE vehicle_number = 'EVP013';

UPDATE riders SET
  vehicle_assigned = 'EVP013'
WHERE rider_id = 'D252706';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP013'),
  status = 'MAPPED'
WHERE battery_id = 'B769718';

-- Record 78: EVP011 -> Driver: D252707 -> Battery: B738016
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B738016'),
  rider_id = 'D252707'
WHERE vehicle_number = 'EVP011';

UPDATE riders SET
  vehicle_assigned = 'EVP011'
WHERE rider_id = 'D252707';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP011'),
  status = 'MAPPED'
WHERE battery_id = 'B738016';

-- Record 79: EVP033 -> Driver: D252708 -> Battery: B514898
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B514898'),
  rider_id = 'D252708'
WHERE vehicle_number = 'EVP033';

UPDATE riders SET
  vehicle_assigned = 'EVP033'
WHERE rider_id = 'D252708';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP033'),
  status = 'MAPPED'
WHERE battery_id = 'B514898';

-- Record 80: EVP026 -> Driver: D252709 -> Battery: B918833
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B918833'),
  rider_id = 'D252709'
WHERE vehicle_number = 'EVP026';

UPDATE riders SET
  vehicle_assigned = 'EVP026'
WHERE rider_id = 'D252709';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP026'),
  status = 'MAPPED'
WHERE battery_id = 'B918833';

-- Record 81: EVP012 -> Driver: D252710 -> Battery: B659079
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B659079'),
  rider_id = 'D252710'
WHERE vehicle_number = 'EVP012';

UPDATE riders SET
  vehicle_assigned = 'EVP012'
WHERE rider_id = 'D252710';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP012'),
  status = 'MAPPED'
WHERE battery_id = 'B659079';

-- Record 82: EVP032 -> Driver: D252711 -> Battery: B472294
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B472294'),
  rider_id = 'D252711'
WHERE vehicle_number = 'EVP032';

UPDATE riders SET
  vehicle_assigned = 'EVP032'
WHERE rider_id = 'D252711';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP032'),
  status = 'MAPPED'
WHERE battery_id = 'B472294';

-- Record 83: EVP027 -> Driver: D252712 -> Battery: B548842
UPDATE vehicles SET
  battery_id = (SELECT id FROM batteries WHERE battery_id = 'B548842'),
  rider_id = 'D252712'
WHERE vehicle_number = 'EVP027';

UPDATE riders SET
  vehicle_assigned = 'EVP027'
WHERE rider_id = 'D252712';

UPDATE batteries SET
  vehicle_id = (SELECT id FROM vehicles WHERE vehicle_number = 'EVP027'),
  status = 'MAPPED'
WHERE battery_id = 'B548842';

COMMIT;

-- Summary: 83 mappings processed
-- Run SELECT queries below to verify:
-- SELECT vehicle_number, battery_id, rider_id FROM vehicles WHERE vehicle_number IN ('EVP020', 'LCS5BAB55N9000957', 'LCS5BAB55N9000974', 'EVP010', 'EVP004' ...);
-- SELECT rider_id, vehicle_assigned FROM riders WHERE rider_id IN ('D146301', 'D231228', 'D231235', 'D231360', 'D231361' ...);
-- SELECT battery_id, vehicle_id, status FROM batteries WHERE battery_id IN ('B708523', 'B654748', 'B848143', 'B741181', 'B493913' ...);
