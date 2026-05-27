-- Create forbidden_words table for security policy enforcement
create table if not exists public.forbidden_words (
  id uuid default gen_random_uuid() primary key,
  word text not null unique,
  category text not null default 'general', -- 'financial', 'contact', 'fraud', 'general', etc.
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_by uuid references public.profiles(id) on delete set null,
  reason text -- optional explanation for why the word is forbidden
);

-- Enable RLS for security
alter table public.forbidden_words enable row level security;

-- Only authenticated users can view forbidden words (for informational purposes)
create policy "Users can view forbidden words" on public.forbidden_words
  for select using (true);

-- Only admins can insert/update/delete forbidden words
create policy "Only admins can manage forbidden words" on public.forbidden_words
  for all using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Create index for performance
create index if not exists idx_forbidden_words_word on public.forbidden_words(word);
create index if not exists idx_forbidden_words_is_active on public.forbidden_words(is_active);
create index if not exists idx_forbidden_words_category on public.forbidden_words(category);

-- Create updated_at trigger
create or replace function public.update_forbidden_words_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_forbidden_words_updated_at_trigger
  before update on public.forbidden_words
  for each row
  execute function public.update_forbidden_words_updated_at();

-- Insert some default forbidden words (examples)
insert into public.forbidden_words (word, category, reason) values
  ('paypal', 'financial', 'Payment service - risk of financial scams'),
  ('western union', 'financial', 'Money transfer - high fraud risk'),
  ('bitcoin', 'crypto', 'Cryptocurrency - common scam vector'),
  ('dm me', 'contact', 'Direct message request - phishing indicator'),
  ('contactez-moi', 'contact', 'Contact request - phishing indicator'),
  ('donation', 'financial', 'Donation request - charity scam')
on conflict (word) do nothing;
