import { table } from '../config'
import { supabase } from './supabase'
import type { GameMode } from '../components/QuizPage'

export interface LeaderboardRow {
  quiz_title: string
  user_id: string
  pseudo: string
  avatar: string
  value: number
  elapsed_seconds: number
  created_at: string
}

// Une vue par mode (<prefixe>_leaderboard_*, cf. migration) : meilleure ligne par joueur et par
// quiz, déjà jointe à <prefixe>_profiles pour pseudo/avatar (vue security-definer, volontaire —
// même mécanisme que les leaderboards d'Oliver Quiz — pour lire ces deux champs au-delà de la RLS
// propre à chaque utilisateur).
const VIEW_BY_MODE: Record<GameMode, string> = {
  classic: 'leaderboard_classic',
  timeAttack: 'leaderboard_time_attack',
  noMistake: 'leaderboard_no_mistake',
  blitz: 'leaderboard_blitz',
}
const VALUE_COLUMN_BY_MODE: Record<GameMode, string> = {
  classic: 'best_score',
  timeAttack: 'best_correct',
  noMistake: 'best_streak',
  blitz: 'best_correct',
}

/** Classement d'un quiz pour un mode donné, meilleur score en tête. `[]` si indisponible
 *  (hors-ligne, personne n'a encore joué…) : jamais bloquant pour l'affichage. */
export async function fetchLeaderboard(quizTitle: string, mode: GameMode, limit = 20): Promise<LeaderboardRow[]> {
  const valueColumn = VALUE_COLUMN_BY_MODE[mode]
  const { data, error } = await supabase
    .from(table(VIEW_BY_MODE[mode]))
    .select(`user_id,pseudo,avatar,elapsed_seconds,created_at,value:${valueColumn}`)
    .eq('quiz_title', quizTitle)
    .order(valueColumn, { ascending: false })
    .order('elapsed_seconds', { ascending: true })
    .limit(limit)
  if (error) return []
  return (data as unknown as LeaderboardRow[] | null) ?? []
}
