-- ============================================================================
-- Cosmetics #1: unlockable colour SKINS (a coin sink + anti-boredom).
-- Each player owns 'default' for free (dark/light toggle). Colour skins are
-- bought with coins (server-authoritative spend) and some are league-gated.
-- Prices/min-tier here MUST match app/src/theme.ts SKINS.
-- ============================================================================

alter table public.profiles add column if not exists owned_skins text[] not null default '{}';
alter table public.profiles add column if not exists skin text not null default 'default';

-- Buy a skin: validate price/tier, deduct coins, record ownership.
create or replace function public.unlock_skin(p_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_price int; v_min_tier int; v_coins int; v_tier int; v_owned text[];
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  v_price := case p_id
    when 'sunset' then 3000 when 'ocean' then 3000 when 'forest' then 3000
    when 'neon' then 6000 when 'galaxy' then 12000 else -1 end;
  v_min_tier := case p_id when 'galaxy' then 5 else 1 end;
  if v_price < 0 then raise exception 'BAD_SKIN'; end if;

  select coins, coalesce(league_tier, 1), owned_skins into v_coins, v_tier, v_owned
    from public.profiles where id = v_uid for update;
  if p_id = any(coalesce(v_owned, '{}')) then raise exception 'ALREADY_OWNED'; end if;
  if v_tier < v_min_tier then raise exception 'TIER_LOCKED'; end if;
  if v_coins < v_price then raise exception 'INSUFFICIENT_COINS'; end if;

  update public.profiles
     set coins = coins - v_price, owned_skins = array_append(owned_skins, p_id)
   where id = v_uid returning coins, owned_skins into v_coins, v_owned;
  return jsonb_build_object('coins', v_coins, 'owned_skins', v_owned);
end; $$;
revoke all on function public.unlock_skin(text) from public;
grant execute on function public.unlock_skin(text) to authenticated;

-- Equip a skin you own (or 'default', always allowed).
create or replace function public.equip_skin(p_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_owned text[];
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_id <> 'default' then
    select owned_skins into v_owned from public.profiles where id = v_uid;
    if not (p_id = any(coalesce(v_owned, '{}'))) then raise exception 'NOT_OWNED'; end if;
  end if;
  update public.profiles set skin = p_id where id = v_uid;
  return jsonb_build_object('skin', p_id);
end; $$;
revoke all on function public.equip_skin(text) from public;
grant execute on function public.equip_skin(text) to authenticated;

-- profile snapshot now carries owned skins + equipped skin.
create or replace function public.ensure_profile()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_p public.profiles%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.profiles (id, username, coins)
  values (v_uid, 'Player' || substr(v_uid::text, 1, 4), 1000)
  on conflict (id) do nothing;
  select * into v_p from public.profiles where id = v_uid;
  return jsonb_build_object(
    'id', v_p.id, 'username', v_p.username, 'coins', v_p.coins,
    'xp', coalesce(v_p.xp, 0),
    'win_streak', coalesce(v_p.win_streak, 0),
    'best_win_streak', coalesce(v_p.best_win_streak, 0),
    'league_tier', coalesce(v_p.league_tier, 1),
    'league_points', coalesce(v_p.league_points, 0),
    'owned_skins', coalesce(v_p.owned_skins, '{}'),
    'skin', coalesce(v_p.skin, 'default'),
    'daily_streak', coalesce(v_p.daily_streak, 0),
    'daily_available', (v_p.last_daily is distinct from current_date));
end;
$$;
