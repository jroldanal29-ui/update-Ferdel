-- Actualización del módulo de usuarios de FERDEL Gestión.
-- Ejecutar una vez en el editor SQL del proyecto antes de publicar la nueva versión.

alter table public.profiles add column if not exists email text not null default '';

update public.profiles as profile
set email = auth_user.email
from auth.users as auth_user
where profile.id = auth_user.id and profile.email = '';

update public.profiles as profile
set role = 'administrador', active = true
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = lower('sistema@control.com');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, ''),
    coalesce(new.email, ''),
    case
      when lower(coalesce(new.email, '')) = lower('sistema@control.com')
        then 'administrador'
      when new.raw_user_meta_data->>'role' in ('administrador','almacen','operaciones','gerencia')
        then new.raw_user_meta_data->>'role'
      else 'almacen'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.enforce_primary_admin_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = lower('sistema@control.com') then
    new.role := 'administrador';
    new.active := true;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_primary_admin_profile on public.profiles;
create trigger enforce_primary_admin_profile before insert or update on public.profiles
for each row execute procedure public.enforce_primary_admin_profile();

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'administrador' and active);
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

drop policy if exists "Usuario actualiza su perfil" on public.profiles;
drop policy if exists "Administradores actualizan perfiles" on public.profiles;
create policy "Administradores actualizan perfiles" on public.profiles for update to authenticated
using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create or replace function public.delete_managed_user(target_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Solo un administrador puede eliminar cuentas';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta mientras está en uso';
  end if;
  if exists(select 1 from auth.users where id = target_user_id and lower(email) = lower('sistema@control.com')) then
    raise exception 'La cuenta principal del sistema no puede eliminarse';
  end if;
  delete from auth.users where id = target_user_id;
  if not found then
    raise exception 'La cuenta indicada no existe';
  end if;
end;
$$;

revoke all on function public.delete_managed_user(uuid) from public;
grant execute on function public.delete_managed_user(uuid) to authenticated;
