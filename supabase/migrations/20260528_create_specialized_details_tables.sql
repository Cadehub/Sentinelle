-- Create specialized details tables for different alert types
-- This implements Option A: separate tables for each type

-- Documents (CNI, Passeport, etc.)
create table if not exists public.details_documents (
  id uuid default gen_random_uuid() primary key,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  category text not null, -- 'CNI', 'Passeport', 'Permis de conduire', 'Carte d\'étudiant'
  full_name text not null,
  document_number text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Persons (Missing persons)
create table if not exists public.details_persons (
  id uuid default gen_random_uuid() primary key,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  full_name text not null,
  age integer,
  gender text, -- 'Homme', 'Femme', 'Autre'
  height text, -- e.g., "170 cm"
  distinctive_marks text,
  clothing text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Objects
create table if not exists public.details_objects (
  id uuid default gen_random_uuid() primary key,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  brand text,
  color text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Animals
create table if not exists public.details_animals (
  id uuid default gen_random_uuid() primary key,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  species text not null, -- 'Chien', 'Chat', 'Oiseau', 'Autre'
  color text,
  breed text,
  distinctive_marks text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Vehicles
create table if not exists public.details_vehicles (
  id uuid default gen_random_uuid() primary key,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  registration_number text,
  brand text,
  model text,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for all specialized tables
alter table public.details_documents enable row level security;
alter table public.details_persons enable row level security;
alter table public.details_objects enable row level security;
alter table public.details_animals enable row level security;
alter table public.details_vehicles enable row level security;

-- RLS Policies: allow access through alerts table
create policy "Users can view details via alert access" on public.details_documents
  for select using (
    exists (
      select 1 from public.alerts
      where alerts.id = details_documents.alert_id
      and (alerts.user_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
    )
  );

create policy "Users can view details via alert access" on public.details_persons
  for select using (
    exists (
      select 1 from public.alerts
      where alerts.id = details_persons.alert_id
      and (alerts.user_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
    )
  );

create policy "Users can view details via alert access" on public.details_objects
  for select using (
    exists (
      select 1 from public.alerts
      where alerts.id = details_objects.alert_id
      and (alerts.user_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
    )
  );

create policy "Users can view details via alert access" on public.details_animals
  for select using (
    exists (
      select 1 from public.alerts
      where alerts.id = details_animals.alert_id
      and (alerts.user_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
    )
  );

create policy "Users can view details via alert access" on public.details_vehicles
  for select using (
    exists (
      select 1 from public.alerts
      where alerts.id = details_vehicles.alert_id
      and (alerts.user_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
    )
  );

-- Insert policies: only owners can insert
create policy "Users can insert own details" on public.details_documents
  for insert with check (
    exists (
      select 1 from public.alerts
      where alerts.id = details_documents.alert_id
      and alerts.user_id = auth.uid()
    )
  );

create policy "Users can insert own details" on public.details_persons
  for insert with check (
    exists (
      select 1 from public.alerts
      where alerts.id = details_persons.alert_id
      and alerts.user_id = auth.uid()
    )
  );

create policy "Users can insert own details" on public.details_objects
  for insert with check (
    exists (
      select 1 from public.alerts
      where alerts.id = details_objects.alert_id
      and alerts.user_id = auth.uid()
    )
  );

create policy "Users can insert own details" on public.details_animals
  for insert with check (
    exists (
      select 1 from public.alerts
      where alerts.id = details_animals.alert_id
      and alerts.user_id = auth.uid()
    )
  );

create policy "Users can insert own details" on public.details_vehicles
  for insert with check (
    exists (
      select 1 from public.alerts
      where alerts.id = details_vehicles.alert_id
      and alerts.user_id = auth.uid()
    )
  );

-- Create indexes for performance
create index if not exists idx_details_documents_alert_id on public.details_documents(alert_id);
create index if not exists idx_details_persons_alert_id on public.details_persons(alert_id);
create index if not exists idx_details_objects_alert_id on public.details_objects(alert_id);
create index if not exists idx_details_animals_alert_id on public.details_animals(alert_id);
create index if not exists idx_details_vehicles_alert_id on public.details_vehicles(alert_id);
