-- Run this script in your Supabase SQL Editor

-- 1. Create the Users table
create table public.users (
  id uuid references auth.users not null primary key, -- Links to Supabase Auth
  email text unique not null,
  name text,
  phone text,
  postal_code text,
  language text default 'es',
  is_verified boolean default false,
  preferred_severities text[] default '{ "yellow", "orange", "red" }',
  preferred_event_types text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (Security Policies)
alter table public.users enable row level security;

-- 3. Create Policy: Users can see their own data
create policy "Users can view own data" 
  on public.users for select 
  using (auth.uid() = id);

-- 4. Create Policy: Users can update their own data
create policy "Users can update own data" 
  on public.users for update 
  using (auth.uid() = id);

-- 5. Create Policy: New users can insert their own data (during signup)
create policy "Users can insert own data" 
  on public.users for insert 
  with check (auth.uid() = id);

-- 6. (Optional) Admin Policy - allowing specific user to see all (for your Admin view)
-- For now, to keep it simple for your "Admin DB" view in the app:
-- We will allow ANY authenticated user to read all names/emails (Not secure for production, but fits your request)
-- UNCOMMENT THE NEXT LINE IF YOU WANT THE ADMIN VIEW TO WORK FOR NOW:
create policy "Allow all auth users to read all profiles" on public.users for select using (auth.role() = 'authenticated');
