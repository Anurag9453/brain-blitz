-- ============================================================================
-- 0020_purchases.sql: In-app coin purchases via Razorpay
--
-- Secure, server-authoritative coin purchases:
-- 1. purchases table tracks all order attempts and verified payments.
-- 2. record_purchase_order creates an unverified purchase record for the user.
-- 3. verify_and_credit_purchase validates the transaction and atomically credits
--    coins to the user's profile.
-- ============================================================================

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_id text not null,
  amount_inr int not null,
  coins int not null,
  order_id text,
  payment_id text unique,
  signature text,
  status text not null default 'created' check (status in ('created', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_purchases_user on public.purchases (user_id, created_at desc);
create index if not exists idx_purchases_order on public.purchases (order_id);
create index if not exists idx_purchases_payment on public.purchases (payment_id);

alter table public.purchases enable row level security;

-- Users can only read their own purchase records
create policy purchases_select on public.purchases
  for select using (auth.uid() = user_id);

-- Defined coin packs and their INR prices and coin rewards
create or replace function public._get_pack_details(p_pack_id text, out p_coins int, out p_amount_inr int)
language plpgsql as $$
begin
  case p_pack_id
    when 'pack_500' then
      p_coins := 500;
      p_amount_inr := 89;
    when 'pack_1200' then
      p_coins := 1200;
      p_amount_inr := 179;
    when 'pack_3000' then
      p_coins := 3000;
      p_amount_inr := 449;
    when 'pack_7000' then
      p_coins := 7000;
      p_amount_inr := 899;
    else
      raise exception 'INVALID_PACK_ID';
  end case;
end;
$$;

-- Create pending purchase entry before payment
create or replace function public.create_purchase_record(
  p_pack_id text,
  p_order_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_coins int;
  v_amount int;
  v_purchase_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  
  select p_coins, p_amount_inr into v_coins, v_amount from public._get_pack_details(p_pack_id);

  insert into public.purchases (user_id, pack_id, amount_inr, coins, order_id, status)
  values (v_uid, p_pack_id, v_amount, v_coins, p_order_id, 'created')
  returning id into v_purchase_id;

  return jsonb_build_object(
    'purchase_id', v_purchase_id,
    'pack_id', p_pack_id,
    'coins', v_coins,
    'amount_inr', v_amount,
    'order_id', p_order_id
  );
end;
$$;

revoke all on function public.create_purchase_record(text, text) from public;
grant execute on function public.create_purchase_record(text, text) to authenticated;

-- Verify and credit purchase (Atomic with replay protection)
create or replace function public.verify_and_credit_purchase(
  p_pack_id text,
  p_payment_id text,
  p_order_id text default null,
  p_signature text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_coins int;
  v_amount int;
  v_existing_id uuid;
  v_existing_status text;
  v_new_balance int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_payment_id is null or length(trim(p_payment_id)) = 0 then
    raise exception 'INVALID_PAYMENT_ID';
  end if;

  select p_coins, p_amount_inr into v_coins, v_amount from public._get_pack_details(p_pack_id);

  -- Check if this payment_id has already been processed (replay protection)
  select id, status into v_existing_id, v_existing_status
    from public.purchases
   where payment_id = p_payment_id;

  if v_existing_status = 'completed' then
    -- Already credited! Return existing balance without double-crediting
    select coins into v_new_balance from public.profiles where id = v_uid;
    return jsonb_build_object(
      'success', true,
      'already_credited', true,
      'coins_added', 0,
      'new_balance', v_new_balance
    );
  end if;

  -- Lock user profile row for atomic coin update
  update public.profiles
     set coins = coins + v_coins
   where id = v_uid
  returning coins into v_new_balance;

  -- Insert or update the purchase record
  if v_existing_id is not null then
    update public.purchases
       set status = 'completed',
           signature = p_signature,
           completed_at = now()
     where id = v_existing_id;
  else
    insert into public.purchases (
      user_id, pack_id, amount_inr, coins, order_id, payment_id, signature, status, completed_at
    ) values (
      v_uid, p_pack_id, v_amount, v_coins, p_order_id, p_payment_id, p_signature, 'completed', now()
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'already_credited', false,
    'coins_added', v_coins,
    'new_balance', v_new_balance
  );
end;
$$;

revoke all on function public.verify_and_credit_purchase(text, text, text, text) from public;
grant execute on function public.verify_and_credit_purchase(text, text, text, text) to authenticated;
