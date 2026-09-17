-- CONFIGURACIÓN ANTERIOR (ya no es necesaria).
-- Desde la versión 1.2.0 las actualizaciones se distribuyen con GitHub Releases.
-- Se conserva este archivo únicamente como referencia y no debe ejecutarse.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-updates',
  'app-updates',
  true,
  314572800,
  array['application/octet-stream', 'application/x-msdownload', 'text/yaml', 'text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Actualizaciones FERDEL de lectura pública" on storage.objects;
create policy "Actualizaciones FERDEL de lectura pública"
on storage.objects for select
to public
using (bucket_id = 'app-updates');
