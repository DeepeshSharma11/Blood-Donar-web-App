-- 1. Create table for active organ donor pledges
CREATE TABLE IF NOT EXISTS public.organ_donors (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(255) NOT NULL,
    organs TEXT NOT NULL, -- comma-separated list of pledged organs (e.g. "Kidneys, Liver")
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_available BOOLEAN DEFAULT TRUE,
    city VARCHAR(255),
    state VARCHAR(255)
);

-- Enable RLS on organ_donors
ALTER TABLE public.organ_donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to organ donors" 
ON public.organ_donors FOR SELECT USING (true);

CREATE POLICY "Allow registered users to manage their organ donor profiles" 
ON public.organ_donors FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- 2. Create table for organ transplant requests
CREATE TABLE IF NOT EXISTS public.organ_requests (
    id BIGSERIAL PRIMARY KEY,
    hospital_name TEXT NOT NULL,
    organ_type VARCHAR(100) NOT NULL,
    urgency TEXT CHECK (urgency IN ('Emergency', 'High', 'Medium', 'Low')),
    status TEXT DEFAULT 'Searching' CHECK (status IN ('Searching', 'Matched', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on organ_requests
ALTER TABLE public.organ_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to organ requests" 
ON public.organ_requests FOR SELECT USING (true);

CREATE POLICY "Allow all users to submit organ requests" 
ON public.organ_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admins/hospitals to manage organ requests" 
ON public.organ_requests FOR UPDATE USING (true);

-- Seed initial test entries for organ requests
INSERT INTO public.organ_requests (hospital_name, organ_type, urgency, status)
VALUES 
('Apollo Medical Center', 'Kidneys', 'Emergency', 'Searching'),
('Max Healthcare Hospital', 'Liver', 'High', 'Searching')
ON CONFLICT DO NOTHING;
