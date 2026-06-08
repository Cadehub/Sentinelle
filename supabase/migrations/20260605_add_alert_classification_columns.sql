alter table public.alerts
add column if not exists main_type text;

alter table public.alerts
add column if not exists sub_type text;

alter table public.alerts
add column if not exists item_category text;

create index if not exists idx_alerts_main_type on public.alerts(main_type);
create index if not exists idx_alerts_sub_type on public.alerts(sub_type);
