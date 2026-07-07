-- Ejecutar en Supabase → SQL Editor
-- Proyecto gratuito: https://supabase.com

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  role text not null default 'student' check (role in ('student', 'teacher', 'superadmin')),
  tests_selected text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Usuarios ven su perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuarios actualizan su perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Superadmin ve todos"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'superadmin'
    )
  );

create table if not exists public.user_progress (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  test_id text not null,
  lesson_id text,
  exercise_id text,
  correct boolean,
  payload jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.user_progress enable row level security;

create policy "Progreso propio"
  on public.user_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Superadmin ve progreso"
  on public.user_progress for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'superadmin'
    )
  );

-- El superadmin se asigna automáticamente en la app al email configurado
