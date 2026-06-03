-- Add images column to alerts table
alter table public.alerts 
add column if not exists images text[] default array[]::text[];

-- Create index for better query performance
create index if not exists idx_alerts_images on public.alerts using gin(images);
