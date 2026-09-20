import { storageKey, table } from '../config'
import type { Question } from '../types/quiz'
import { blitzPool, type BlitzStats } from './blitz'
import { supabase } from './supabase'

/** Défi du jour : la même série de questions pour tout le monde, une seule tentative par jour. */
export const DAILY_QUESTION_COUNT = 20

/** Jour du défi, en UTC (même jour pour tous quel que soit le fuseau ; le défi change à minuit UTC). */
export const dailyKey = (date: Date = new Date()): string => date.toISOString().slice(0, 10)
export const dailySeed = (day: string): string => `daily-${day}`

/** Les questions du jour, par leurs identifiants : les premières éligibles au blitz d'un tirage seedé sur la date.
 *  On les retient sur un tirage français puis on les retrouve dans la langue du joueur (mêmes identifiants). */
export function pickDailyIds(questions: Question[]): string[] {
  return blitzPool(questions).slice(0, DAILY_QUESTION_COUNT).map((question) => question.id)
}

export function selectDaily(questions: Question[], ids: string[]): Question[] {
  const byId = new Map(questions.map((question) => [question.id, question]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

function previousDay(day: string): string {
  return dailyKey(new Date(new Date(`${day}T00:00:00Z`).getTime() - 86_400_000))
}

/** Jours consécutifs joués, en comptant à rebours depuis aujourd'hui (ou hier, si aujourd'hui n'est pas encore joué). */
export function dailyStreak(days: string[], today: string): number {
  const played = new Set(days)
  let cursor = played.has(today) ? today : previousDay(today)
  let count = 0
  while (played.has(cursor)) { count += 1; cursor = previousDay(cursor) }
  return count
}

export interface DailyRow {
  user_id: string
  pseudo: string
  avatar: string
  correct_count: number
  played: number
  best_streak: number
  elapsed_seconds: number
}

/** Place du joueur dans un classement déjà trié (bonnes réponses, puis temps) ; `null` s'il n'y figure pas. */
export function dailyRank(rows: DailyRow[], userId: string): { rank: number; total: number } | null {
  const index = rows.findIndex((row) => row.user_id === userId)
  return index < 0 ? null : { rank: index + 1, total: rows.length }
}

// ---- trace locale : garde « une seule tentative » pour un invité, et l'état hors-ligne

export interface DailyLocal {
  finished: boolean
  correct: number
  played: number
  bestStreak: number
  elapsed: number
}
type LocalStore = Record<string, DailyLocal>

function readStore(): LocalStore {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey('daily')) ?? '{}')
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as LocalStore) : {}
  } catch {
    return {}
  }
}

function writeStore(store: LocalStore): void {
  try {
    const recent = Object.fromEntries(Object.entries(store).sort(([a], [b]) => b.localeCompare(a)).slice(0, 60))
    localStorage.setItem(storageKey('daily'), JSON.stringify(recent))
  } catch {
    /* quota ou navigation privée : la trace locale n'est pas bloquante */
  }
}

export const readDailyLocal = (day: string): DailyLocal | null => readStore()[day] ?? null

/** Jours dont le défi a été terminé sur cet appareil. */
export function finishedLocalDays(): string[] {
  return Object.entries(readStore()).filter(([, entry]) => entry.finished).map(([day]) => day)
}

export function markDailyStarted(day: string): void {
  const store = readStore()
  if (!store[day]) store[day] = { finished: false, correct: 0, played: 0, bestStreak: 0, elapsed: 0 }
  writeStore(store)
}

export function markDailyFinished(day: string, stats: BlitzStats, elapsed: number): void {
  const store = readStore()
  store[day] = { finished: true, correct: stats.correct, played: stats.played, bestStreak: stats.bestStreak, elapsed }
  writeStore(store)
}

// ---- cloud (table <prefixe>_daily_results, vue <prefixe>_leaderboard_daily)

export type ClaimResult = 'ok' | 'already' | 'error'

/** Réserve la tentative du jour AVANT de jouer (la clé primaire refuse la seconde) : quitter en cours de route consomme
 *  la tentative, sinon on pourrait voir les questions puis recommencer. */
export async function claimDaily(userId: string, day: string): Promise<ClaimResult> {
  const { error } = await supabase.from(table('daily_results')).insert({ user_id: userId, day })
  if (!error) return 'ok'
  return error.code === '23505' ? 'already' : 'error'
}

/** Inscrit le résultat de la tentative réservée (impossible de le modifier ensuite : règle RLS côté base). */
export async function finishDaily(userId: string, day: string, stats: BlitzStats, elapsed: number): Promise<boolean> {
  const { data, error } = await supabase.from(table('daily_results'))
    .update({ finished_at: new Date().toISOString(), correct_count: stats.correct, played: stats.played, best_streak: stats.bestStreak, elapsed_seconds: elapsed })
    .eq('user_id', userId).eq('day', day).is('finished_at', null)
    .select('day')
  return !error && Boolean(data?.length)
}

/** Classement du jour, meilleur en tête. `[]` si indisponible : jamais bloquant. */
export async function fetchDailyLeaderboard(day: string, limit = 50): Promise<DailyRow[]> {
  const { data, error } = await supabase.from(table('leaderboard_daily'))
    .select('user_id,pseudo,avatar,correct_count,played,best_streak,elapsed_seconds')
    .eq('day', day)
    .order('correct_count', { ascending: false })
    .order('elapsed_seconds', { ascending: true })
    .limit(limit)
  return error ? [] : ((data as unknown as DailyRow[] | null) ?? [])
}

export interface MyDailyRow {
  day: string
  finished_at: string | null
  correct_count: number
  played: number
}

export async function fetchMyDaily(userId: string): Promise<MyDailyRow[]> {
  const { data, error } = await supabase.from(table('daily_results'))
    .select('day,finished_at,correct_count,played')
    .eq('user_id', userId)
    .order('day', { ascending: false })
    .limit(90)
  return error ? [] : ((data as unknown as MyDailyRow[] | null) ?? [])
}
