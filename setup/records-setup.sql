-- 1. Create table for user profiles to manage roles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    role TEXT CHECK (role IN ('admin', 'user', 'hospital')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow individual write access to profiles" 
ON public.profiles FOR ALL USING (auth.uid() = id);

-- 2. Trigger function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute when a user is registered
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create table for active donor profiles (linking optionally to user profile)
CREATE TABLE IF NOT EXISTS public.donors (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(255) NOT NULL,
    blood_group VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_available BOOLEAN DEFAULT TRUE,
    last_donation_date DATE,
    city VARCHAR(255),
    state VARCHAR(255)
);

-- Enable RLS on donors
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to donors" 
ON public.donors FOR SELECT USING (true);

CREATE POLICY "Allow registered users to manage their donor profiles" 
ON public.donors FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- 4. Create table for hospital blood requirements
CREATE TABLE IF NOT EXISTS public.blood_requests (
    id BIGSERIAL PRIMARY KEY,
    hospital_name TEXT NOT NULL,
    blood_type VARCHAR(10) NOT NULL,
    units INTEGER NOT NULL,
    urgency TEXT CHECK (urgency IN ('Emergency', 'High', 'Medium', 'Low')),
    status TEXT DEFAULT 'Searching' CHECK (status IN ('Searching', 'Matched', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on blood_requests
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to blood requests" 
ON public.blood_requests FOR SELECT USING (true);

CREATE POLICY "Allow all users to submit blood requests" 
ON public.blood_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admins/hospitals to manage blood requests" 
ON public.blood_requests FOR UPDATE USING (true);

-- Seed initial test entries for blood requests
INSERT INTO public.blood_requests (hospital_name, blood_type, units, urgency, status)
VALUES 
('City Heart Hospital', 'A-', 4, 'Emergency', 'Searching'),
('St. Jude Clinic', 'O+', 10, 'High', 'Matched')
ON CONFLICT DO NOTHING;
