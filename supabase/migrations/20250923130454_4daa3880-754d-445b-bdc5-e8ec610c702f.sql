-- Add new columns to riders table for comprehensive rider information

-- Section 1: Personal Information
ALTER TABLE public.riders 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN mobile_number TEXT,
ADD COLUMN dob DATE,
ADD COLUMN aadhaar_number TEXT,
ADD COLUMN pan_number TEXT,
ADD COLUMN address_line1 TEXT,
ADD COLUMN address_line2 TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN pincode TEXT,
ADD COLUMN address_google_link TEXT,
ADD COLUMN marital_status TEXT CHECK (marital_status IN ('SINGLE', 'MARRIED')),
ADD COLUMN dependent_name TEXT,
ADD COLUMN dependent_relation TEXT CHECK (dependent_relation IN ('FATHER', 'MOTHER', 'BROTHER', 'SPOUSE', 'OTHER')),
ADD COLUMN dependent_aadhaar TEXT;

-- Section 2: Banking Information  
ALTER TABLE public.riders
ADD COLUMN bank_name TEXT,
ADD COLUMN branch_name TEXT,
ADD COLUMN ifsc_code TEXT,
ADD COLUMN account_number TEXT;

-- Section 3: Employment Information
ALTER TABLE public.riders
ADD COLUMN aggregator TEXT CHECK (aggregator IN ('SWIGGY', 'ZOMATO', 'ZEPTO', 'BLINKIT', 'BIGBASKET', 'OTHER')),
ADD COLUMN aggregator_other TEXT,
ADD COLUMN aggregator_id TEXT,
ADD COLUMN joined_since DATE,
ADD COLUMN avg_earnings_15_days INTEGER;

-- Section 4: Office Use
ALTER TABLE public.riders
ADD COLUMN onboarded_by TEXT CHECK (onboarded_by IN ('SHUBHAM', 'VAIBHAV')),
ADD COLUMN aggregator_credentials_checked BOOLEAN DEFAULT false,
ADD COLUMN id_credentials_checked BOOLEAN DEFAULT false,
ADD COLUMN retained_document_details TEXT;

-- Add new status fields
ALTER TABLE public.riders
ADD COLUMN duty_status TEXT CHECK (duty_status IN ('IDLE', 'LIVE')) DEFAULT 'IDLE';

-- Update the existing status enum to include new values if needed
DO $$
BEGIN
  -- Check if 'deboarded' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'deboarded' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'rider_status')
  ) THEN
    ALTER TYPE rider_status ADD VALUE 'deboarded';
  END IF;
END $$;