-- ============================================================================
-- 0023_question_reports.sql: In-app question quality reports & feedback
--
-- Allows students to flag any inaccurate, confusing, or misspelled questions.
-- Stored with RLS enabled so players can report questions easily.
-- ============================================================================

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  question text not null,
  tag text not null,
  correct_answer text,
  chosen_answer text,
  reason text not null,
  comments text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.question_reports enable row level security;

create policy question_reports_insert on public.question_reports
  for insert with check (auth.uid() = user_id or user_id is null);

create policy question_reports_select_own on public.question_reports
  for select using (auth.uid() = user_id);

-- RPC to record a question report securely
create or replace function public.report_question(
  p_question text,
  p_tag text,
  p_correct text,
  p_chosen text default null,
  p_reason text default 'error',
  p_comments text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  insert into public.question_reports (
    user_id, question, tag, correct_answer, chosen_answer, reason, comments
  ) values (
    v_uid, p_question, p_tag, p_correct, p_chosen, p_reason, p_comments
  ) returning id into v_id;

  return jsonb_build_object('ok', true, 'report_id', v_id);
end;
$$;

revoke all on function public.report_question(text, text, text, text, text, text) from public;
grant execute on function public.report_question(text, text, text, text, text, text) to authenticated;
