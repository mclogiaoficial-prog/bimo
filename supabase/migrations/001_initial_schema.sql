create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  profissao text,
  created_at timestamptz default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  observacoes text,
  created_at timestamptz default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nome text not null,
  preco numeric(10,2) default 0,
  descricao text,
  created_at timestamptz default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id),
  service_id uuid references public.services(id),
  data_hora timestamptz,
  status text default 'agendado',
  observacoes text,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id),
  descricao text,
  status text default 'aberta',
  valor numeric(10,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id),
  descricao text,
  tipo text,
  valor numeric(10,2) default 0,
  vencimento date,
  pago boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;

create policy "profile_owner"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "clients_owner"
on public.clients for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "services_owner"
on public.services for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "appointments_owner"
on public.appointments for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "orders_owner"
on public.orders for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "transactions_owner"
on public.transactions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
