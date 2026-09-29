-- Actualización del módulo de usuarios de FERDEL Gestión.
-- Ejecutar una vez en el editor SQL del proyecto antes de publicar la nueva versión.

alter table public.profiles add column if not exists email text not null default '';

update public.profiles as profile
set email = auth_user.email
from auth.users as auth_user
where profile.id = auth_user.id and profile.email = '';

update public.profiles
set role = 'administrador'
where id = (select id from auth.users order by created_at asc limit 1)
  and not exists (select 1 from public.profiles where role = 'administrador');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, ''),
    coalesce(new.email, ''),
    case
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
