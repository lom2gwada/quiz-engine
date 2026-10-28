-- Durcissement des règles d'accès — voir docs/security.md (audit du 28/10/2026).
-- À exécuter dans l'éditeur SQL de Supabase. Partie 1 : sans risque, à tout moment. Partie 2 : seulement une fois la partie 1 appliquée ET les applis
-- redéployées avec le moteur à jour (qui appelle finish_*_daily et n'a plus besoin des règles UPDATE).

-- ============================ PARTIE 1 — contraintes et fonctions ============================
-- quiz_forge -----------------------------------------------------------------------------------------------
alter table public.quiz_forge_quiz_results
  add constraint quiz_forge_quiz_results_plausible check (
    score between 0 and 100
    and earned_points between 0 and total_points
    and correct_count between 0 and question_count
    and question_count between 1 and 2000
    and elapsed_seconds >= 0 and elapsed_seconds * 2 >= question_count   -- au moins une demi-seconde par question
    and created_at <= now() + interval '5 minutes'
  );

create or replace function public.finish_quiz_forge_daily(p_day date, p_correct int, p_played int, p_best_streak int, p_elapsed int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started timestamptz;
begin
  if auth.uid() is null then return false; end if;
  if p_day <> (now() at time zone 'utc')::date then return false; end if;                        -- seulement la tentative du jour
  if p_played < 0 or p_played > 20 then return false; end if;                                    -- 20 questions au plus
  if p_correct < 0 or p_correct > p_played or p_best_streak < 0 or p_best_streak > p_correct then return false; end if;
  select started_at into v_started from public.quiz_forge_daily_results
    where user_id = auth.uid() and day = p_day and finished_at is null;                           -- tentative réservée, pas encore terminée
  if not found then return false; end if;
  if p_elapsed < 0 or p_elapsed * 2 < p_played then return false; end if;                         -- au moins une demi-seconde par question
  if p_elapsed > extract(epoch from (now() - v_started)) + 10 then return false; end if;          -- pas plus que le temps réellement écoulé
  update public.quiz_forge_daily_results
    set finished_at = now(), correct_count = p_correct, played = p_played, best_streak = p_best_streak, elapsed_seconds = p_elapsed
    where user_id = auth.uid() and day = p_day and finished_at is null;
  return found;
end;
$$;
revoke all on function public.finish_quiz_forge_daily(date, int, int, int, int) from public, anon;
grant execute on function public.finish_quiz_forge_daily(date, int, int, int, int) to authenticated;

-- periodic -----------------------------------------------------------------------------------------------
alter table public.periodic_quiz_results
  add constraint periodic_quiz_results_plausible check (
    score between 0 and 100
    and earned_points between 0 and total_points
    and correct_count between 0 and question_count
    and question_count between 1 and 2000
    and elapsed_seconds >= 0 and elapsed_seconds * 2 >= question_count   -- au moins une demi-seconde par question
    and created_at <= now() + interval '5 minutes'
  );

create or replace function public.finish_periodic_daily(p_day date, p_correct int, p_played int, p_best_streak int, p_elapsed int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started timestamptz;
begin
  if auth.uid() is null then return false; end if;
  if p_day <> (now() at time zone 'utc')::date then return false; end if;                        -- seulement la tentative du jour
  if p_played < 0 or p_played > 20 then return false; end if;                                    -- 20 questions au plus
  if p_correct < 0 or p_correct > p_played or p_best_streak < 0 or p_best_streak > p_correct then return false; end if;
  select started_at into v_started from public.periodic_daily_results
    where user_id = auth.uid() and day = p_day and finished_at is null;                           -- tentative réservée, pas encore terminée
  if not found then return false; end if;
  if p_elapsed < 0 or p_elapsed * 2 < p_played then return false; end if;                         -- au moins une demi-seconde par question
  if p_elapsed > extract(epoch from (now() - v_started)) + 10 then return false; end if;          -- pas plus que le temps réellement écoulé
  update public.periodic_daily_results
    set finished_at = now(), correct_count = p_correct, played = p_played, best_streak = p_best_streak, elapsed_seconds = p_elapsed
    where user_id = auth.uid() and day = p_day and finished_at is null;
  return found;
end;
$$;
revoke all on function public.finish_periodic_daily(date, int, int, int, int) from public, anon;
grant execute on function public.finish_periodic_daily(date, int, int, int, int) to authenticated;

-- Un déclencheur n'a pas à être appelable par l'API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================ PARTIE 2 — retirer ce qui n'est plus nécessaire ============================
-- Plus de modification possible d'un résultat déjà enregistré, ni de fin de défi hors fonction.
drop policy if exists "Users can update their own quiz-forge quiz results" on public.quiz_forge_quiz_results;
drop policy if exists "Users can update their own quiz-forge question results" on public.quiz_forge_question_results;
drop policy if exists "Users can finish their unfinished daily attempt" on public.quiz_forge_daily_results;
drop policy if exists "Users can update their own periodic quiz results" on public.periodic_quiz_results;
drop policy if exists "Users can update their own periodic question results" on public.periodic_question_results;
drop policy if exists "Users can finish their unfinished daily attempt" on public.periodic_daily_results;

-- Privilèges de table : RLS reste la règle, mais anon n'a pas à pouvoir écrire, ni authenticated vider une table.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
-- (la lecture publique des jeux de données et des classements passe par SELECT, conservé)
