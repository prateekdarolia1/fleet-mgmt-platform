-- Add Noida to Uttar Pradesh cities
UPDATE places
SET cities = cities || '["Noida"]'::jsonb
WHERE state_or_ut = 'Uttar Pradesh'
AND NOT cities ? 'Noida';