-- ============================================================================
-- 0027_purchases_survive_user_delete.sql: Make 0026's anonymisation actually work
--
-- 0020 created purchases.user_id as NOT NULL with ON DELETE CASCADE, so
-- delete_user_account() (0026) failed for anyone with a purchase, and a profile
-- delete would have removed the rows anyway. Allow NULL and set it on delete,
-- so payment records are kept (statutory retention) without a personal link.
-- ============================================================================

alter table public.purchases alter column user_id drop not null;

alter table public.purchases drop constraint if exists purchases_user_id_fkey;
alter table public.purchases
  add constraint purchases_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;
