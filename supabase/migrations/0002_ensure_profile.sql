-- ============================================================================
-- ensure_profile: create the caller's profile (with the 500-coin starter
-- balance) if it doesn't exist yet, then return it.
--
-- Why: the signup trigger only fires for users created AFTER it exists. Anyone
-- who signed in during early testing has no profile row. The client calls this
-- on every launch so a profile is always present — no manual backfill needed.
-- ============================================================================
create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_p   public.profiles%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  insert into public.profiles (id, username, coins)
  values (v_uid, 'Player' || substr(v_uid::text, 1, 4), 500)
  on conflict (id) do nothing;

  select * into v_p from public.profiles where id = v_uid;
  return v_p;
end;
$$;

revoke all on function public.ensure_profile() from public;
grant execute on function public.ensure_profile() to authenticated;

-- One-off backfill for any existing users who have no profile yet.
insert into public.profiles (id, username, coins)
select u.id, 'Player' || substr(u.id::text, 1, 4), 500
  from auth.users u
  left join public.profiles p on p.id = u.id
 where p.id is null;
