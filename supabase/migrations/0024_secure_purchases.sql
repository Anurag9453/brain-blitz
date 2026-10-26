-- ============================================================================
-- 0024_secure_purchases.sql: Cryptographic server-only purchase crediting
--
-- Closes client execution vulnerability & pack-swap exploit:
-- 1. Drops client access to verify_and_credit_purchase.
-- 2. _internal_credit_purchase is restricted strictly to service_role.
-- 3. Completely ignores client pack_id: looks up the authoritative pack & coins
--    recorded in `purchases` when the Razorpay order was created on the server.
-- ============================================================================

-- Drop legacy client function if it exists (automatically removes all grants)
drop function if exists public.verify_and_credit_purchase(text, text, text, text);
drop function if exists public.verify_and_credit_purchase;

-- Drop previous signature of _internal_credit_purchase if it took pack_id
drop function if exists public._internal_credit_purchase(uuid, text, text, text, text);
drop function if exists public._internal_credit_purchase;

-- Hardened internal credit function: derives coins strictly from the verified order record
create or replace function public._internal_credit_purchase(
  p_user_id uuid,
  p_order_id text,
  p_payment_id text,
  p_signature text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase record;
  v_new_balance int;
begin
  if p_user_id is null then raise exception 'USER_ID_REQUIRED'; end if;
  if p_order_id is null or length(trim(p_order_id)) = 0 then raise exception 'ORDER_ID_REQUIRED'; end if;
  if p_payment_id is null or length(trim(p_payment_id)) = 0 then raise exception 'PAYMENT_ID_REQUIRED'; end if;

  -- 1. Find the order created for this specific user (locks the row)
  select id, pack_id, coins, amount_inr, status
    into v_purchase
    from public.purchases
   where order_id = p_order_id and user_id = p_user_id
     for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND_FOR_USER';
  end if;

  -- 2. Replay protection: check if already completed
  if v_purchase.status = 'completed' then
    select coins into v_new_balance from public.profiles where id = p_user_id;
    return jsonb_build_object(
      'success', true,
      'already_credited', true,
      'pack_id', v_purchase.pack_id,
      'coins_added', 0,
      'new_balance', v_new_balance
    );
  end if;

  -- 3. Atomically add the coins recorded at order creation time
  update public.profiles
     set coins = coins + v_purchase.coins
   where id = p_user_id
  returning coins into v_new_balance;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  -- 4. Mark the purchase record completed
  update public.purchases
     set status = 'completed',
         payment_id = p_payment_id,
         signature = p_signature,
         completed_at = now()
   where id = v_purchase.id;

  return jsonb_build_object(
    'success', true,
    'already_credited', false,
    'pack_id', v_purchase.pack_id,
    'coins_added', v_purchase.coins,
    'new_balance', v_new_balance
  );
end;
$$;

-- AIRTIGHT SECURITY: Revoke execution from all public/client roles
revoke all on function public._internal_credit_purchase(uuid, text, text, text) from public, authenticated, anon;

-- Grant execution ONLY to service_role (used by Edge Functions and Webhooks)
grant execute on function public._internal_credit_purchase(uuid, text, text, text) to service_role;
