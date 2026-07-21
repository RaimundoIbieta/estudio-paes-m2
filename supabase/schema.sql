-- Ejecutar en Supabase → SQL Editor (proyecto gratuito: https://supabase.com)
-- Luego en Authentication → Providers → Email:
--   desactiva "Confirm email" para que admin pueda crear alumnos y entren al tiro.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  role text not null default 'student' check (role in ('student', 'teacher', 'superadmin')),
  disabled boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subscriptions (
  email text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  plan text default 'monthly',
  until timestamptz,
  activated_at timestamptz default now(),
  granted_by text
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

-- Helpers
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superadmin' and coalesce(p.disabled, false) = false
  );
$$;

-- Profiles policies
drop policy if exists "Usuarios ven su perfil" on public.profiles;
drop policy if exists "Usuarios actualizan su perfil" on public.profiles;
drop policy if exists "Superadmin ve todos" on public.profiles;
drop policy if exists "Superadmin actualiza perfiles" on public.profiles;
drop policy if exists "Insert propio perfil" on public.profiles;

create policy "Usuarios ven su perfil"
  on public.profiles for select
  using (auth.uid() = id or public.is_superadmin());

create policy "Usuarios actualizan su perfil"
  on public.profiles for update
  using (auth.uid() = id or public.is_superadmin());

create policy "Insert propio perfil"
  on public.profiles for insert
  with check (auth.uid() = id or public.is_superadmin());

-- Subscriptions policies
drop policy if exists "Ver propia suscripcion" on public.subscriptions;
drop policy if exists "Superadmin gestiona suscripciones" on public.subscriptions;
drop policy if exists "Usuario gestiona su suscripcion" on public.subscriptions;
drop policy if exists "Usuario actualiza su suscripcion" on public.subscriptions;

create policy "Ver propia suscripcion"
  on public.subscriptions for select
  using (
    public.is_superadmin()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or user_id = auth.uid()
  );

create policy "Superadmin gestiona suscripciones"
  on public.subscriptions for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Usuario gestiona su suscripcion"
  on public.subscriptions for insert
  with check (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Usuario actualiza su suscripcion"
  on public.subscriptions for update
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Auto-perfil al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  v_name text := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_super text := lower(coalesce(new.raw_user_meta_data->>'superadmin_email', ''));
begin
  if lower(new.email) = v_super then
    v_role := 'superadmin';
  end if;
  if v_role not in ('student', 'teacher', 'superadmin') then
    v_role := 'student';
  end if;
  insert into public.profiles (id, email, name, role)
  values (new.id, lower(new.email), v_name, v_role)
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RPC: grant subscription (solo superadmin)
create or replace function public.grant_subscription(p_email text, p_months int default 1)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until timestamptz;
  v_row public.subscriptions;
  v_uid uuid;
begin
  if not public.is_superadmin() then
    raise exception 'Sin permisos';
  end if;
  v_until := now() + make_interval(months => greatest(coalesce(p_months, 1), 1));
  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  insert into public.subscriptions (email, user_id, plan, until, activated_at, granted_by)
  values (lower(p_email), v_uid, 'monthly', v_until, now(), coalesce(auth.jwt() ->> 'email', 'admin'))
  on conflict (email) do update
    set until = case
          when public.subscriptions.until is not null and public.subscriptions.until > now()
            then public.subscriptions.until + make_interval(months => greatest(coalesce(p_months, 1), 1))
          else v_until
        end,
        user_id = coalesce(excluded.user_id, public.subscriptions.user_id),
        activated_at = now(),
        granted_by = excluded.granted_by
  returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.grant_subscription(text, int) to authenticated;
grant execute on function public.is_superadmin() to authenticated;
