alter table public.houses
add column if not exists logo_url text not null default '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'house-logos',
    'house-logos',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/svg+xml']
)
on conflict (id) do update
set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their house logos" on storage.objects;
create policy "Users can read their house logos"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'house-logos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload their house logos" on storage.objects;
create policy "Users can upload their house logos"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'house-logos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can update their house logos" on storage.objects;
create policy "Users can update their house logos"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'house-logos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
    bucket_id = 'house-logos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete their house logos" on storage.objects;
create policy "Users can delete their house logos"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'house-logos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);
