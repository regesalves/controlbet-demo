-- Registration helper used by src/pages/RegisterPage.jsx.
-- It checks profile-like metadata stored on auth.users before sign-up.

create or replace function public.check_profile_availability(
    p_username text,
    p_phone text
)
returns table (
    username_available boolean,
    phone_available boolean
)
language sql
security definer
set search_path = auth, public
as $$
    select
        not exists (
            select 1
            from auth.users
            where lower(coalesce(raw_user_meta_data ->> 'username', '')) = lower(trim(coalesce(p_username, '')))
                and trim(coalesce(p_username, '')) <> ''
        ) as username_available,
        not exists (
            select 1
            from auth.users
            where regexp_replace(coalesce(raw_user_meta_data ->> 'phone', ''), '\D', '', 'g') =
                regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
                and regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') <> ''
        ) as phone_available;
$$;

grant execute on function public.check_profile_availability(text, text) to anon;
grant execute on function public.check_profile_availability(text, text) to authenticated;
