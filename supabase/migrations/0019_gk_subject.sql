-- ============================================================================
-- General Knowledge subject: Friends rooms may now be created with 'gk'.
-- Same as 0012's create_room, with 'gk' added to the allowed subjects.
-- ============================================================================

create or replace function public.create_room(p_level int, p_subject text default 'mixed', p_seconds int default 120)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_name text; v_code text; v_seed int := floor(random() * 2000000000)::int;
  v_fee int; v_id uuid; v_try int := 0; v_sub text := lower(coalesce(p_subject, 'mixed'));
  v_secs int := greatest(30, least(600, coalesce(p_seconds, 120)));
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select fee into v_fee from public.levels where n = p_level;
  if v_fee is null then raise exception 'BAD_LEVEL'; end if;
  if v_sub not in ('maths', 'physics', 'chemistry', 'gk', 'mixed') then v_sub := 'mixed'; end if;
  select username into v_name from public.profiles where id = v_uid;
  loop
    v_try := v_try + 1;
    v_code := upper(substr(md5(random()::text), 1, 6));
    begin
      insert into public.rooms (code, host, level, seed, subject, fee, duration_seconds)
      values (v_code, v_uid, p_level, v_seed, v_sub, v_fee, v_secs) returning id into v_id;
      exit;
    exception when unique_violation then if v_try > 5 then raise exception 'CODE_COLLISION'; end if;
    end;
  end loop;
  insert into public.room_players (room_id, user_id, username) values (v_id, v_uid, coalesce(v_name, 'Player'));
  return jsonb_build_object('room_id', v_id, 'code', v_code);
end; $$;
revoke all on function public.create_room(int, text, int) from public;
grant execute on function public.create_room(int, text, int) to authenticated;
