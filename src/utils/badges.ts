import { storageKey, table } from '../config'
import type { GameMode } from '../components/QuizPage'
import type { QuizResultRow, StatBucket } from '../types/history'
import type { BlitzStats } from './blitz'
import { supabase } from './supabase'

export type BadgeId = 'streak10' | 'flawless20' | 'globe10' | 'globe25' | 'globe50' | 'blitz50' | 'record1' | 'daily7' | 'classic7' | 'allModes'

/** Ordre d'affichage. Nom et condition : messages `badge.<id>` et `badge.<id>.hint`. */
export const BADGES: { id: BadgeId; icon: string }[] = [
  { id: 'streak10', icon: '🔥' },
  { id: 'flawless20', icon: '🛡️' },
  { id: 'globe10', icon: '🥉' },
  { id: 'globe25', icon: '🥈' },
  { id: 'globe50', icon: '🥇' },
  { id: 'blitz50', icon: '⚡' },
  { id: 'record1', icon: '🏆' },
  { id: 'daily7', icon: '📅' },
  { id: 'classic7', icon: '📖' },
  { id: 'allModes', icon: '🎲' },
]

/** Paliers du globe-trotter : bronze/argent/or, mêmes catégories, seuil de bonnes réponses croissant. */
const GLOBE_TIERS: { id: BadgeId; threshold: number }[] = [
  { id: 'globe10', threshold: 10 },
  { id: 'globe25', threshold: 25 },
  { id: 'globe50', threshold: 50 },
]

export interface BadgeContext {
  /** Bilan de la partie si c'est un blitz (défi du jour compris), sinon `null`. */
  stats: BlitzStats | null
  /** Partie de blitz « libre » (ni classique, ni défi du jour). */
  freeBlitz: boolean
  /** A battu son record personnel (n'importe quel mode) avec cette partie. */
  brokeRecord: boolean
  /** Historique AVANT cette partie. */
  history: QuizResultRow[]
  /** Bilan par catégorie de cette partie. */
  currentByCategory: Record<string, StatBucket>
  /** Catégories du quiz (les identifiants). */
  categoryIds: string[]
  /** Jours de défi du jour consécutifs, aujourd'hui compris (renseigné à la fin d'un défi du jour). */
  dailyStreakDays?: number
  /** Sans-faute : longueur de la série de bonnes réponses de CETTE partie (équivalent hors blitz de `stats.bestStreak`). */
  noMistakeStreak?: number
  /** Classique : 100 % sur au moins 20 questions avec cette partie (équivalent hors blitz de `flawless20`). */
  classicFlawless?: boolean
  /** Jours consécutifs joués en classique, aujourd'hui compris. */
  classicStreakDays?: number
  /** Les 4 modes de jeu ont été joués aujourd'hui, celui-ci compris. */
  allModesToday?: boolean
}

/** Tous les badges que ce contexte satisfait (y compris ceux déjà obtenus : c'est à l'appelant de filtrer). */
export function earnedBadges(ctx: BadgeContext): BadgeId[] {
  const earned: BadgeId[] = []
  const { stats } = ctx
  if ((stats && stats.bestStreak >= 10) || (ctx.noMistakeStreak ?? 0) >= 10) earned.push('streak10')
  if ((stats && stats.played >= 20 && stats.correct === stats.played) || ctx.classicFlawless) earned.push('flawless20')

  if (ctx.categoryIds.length) {
    const correct: Record<string, number> = {}
    for (const row of ctx.history) for (const [category, bucket] of Object.entries(row.by_category)) correct[category] = (correct[category] ?? 0) + bucket.correct
    for (const [category, bucket] of Object.entries(ctx.currentByCategory)) correct[category] = (correct[category] ?? 0) + bucket.correct
    for (const tier of GLOBE_TIERS) if (ctx.categoryIds.every((id) => (correct[id] ?? 0) >= tier.threshold)) earned.push(tier.id)
  }

  const blitzGames = ctx.history.filter((row) => row.mode === 'blitz').length + (ctx.freeBlitz ? 1 : 0)
  if (blitzGames >= 50) earned.push('blitz50')
  if (ctx.brokeRecord) earned.push('record1')
  if ((ctx.dailyStreakDays ?? 0) >= 7) earned.push('daily7')
  if ((ctx.classicStreakDays ?? 0) >= 7) earned.push('classic7')
  if (ctx.allModesToday) earned.push('allModes')
  return earned
}

/** Les 4 modes ont-ils été joués le même jour (`today`, `YYYY-MM-DD`) ? `history` = parties avant celle-ci,
 *  `currentMode` = mode de cette partie. */
export function playedAllModesToday(history: QuizResultRow[], currentMode: GameMode, today: string): boolean {
  const modes = new Set(history.filter((row) => row.created_at.slice(0, 10) === today).map((row) => row.mode))
  modes.add(currentMode)
  const all: GameMode[] = ['classic', 'timeAttack', 'noMistake', 'blitz']
  return all.every((mode) => modes.has(mode))
}

// ---- stockage : local (source d'affichage) + cloud (table <prefixe>_badges)

export type OwnedBadges = Record<string, string> // id → date d'obtention (ISO)

export function readBadges(): OwnedBadges {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey('badges')) ?? '{}')
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as OwnedBadges) : {}
  } catch {
    return {}
  }
}

export function writeBadges(badges: OwnedBadges): void {
  try {
    localStorage.setItem(storageKey('badges'), JSON.stringify(badges))
  } catch {
    /* non bloquant */
  }
}

/** Ajoute les badges `fresh` (déjà filtrés) à ceux possédés ; renvoie le nouvel ensemble. */
export function addBadges(owned: OwnedBadges, fresh: BadgeId[], now: string): OwnedBadges {
  return { ...owned, ...Object.fromEntries(fresh.filter((id) => !owned[id]).map((id) => [id, now])) }
}

export async function pushBadges(userId: string, ids: string[], earnedAt: string): Promise<void> {
  if (!ids.length) return
  await supabase.from(table('badges')).upsert(ids.map((badge) => ({ user_id: userId, badge, earned_at: earnedAt })), { onConflict: 'user_id,badge', ignoreDuplicates: true })
}

/** Fusionne badges locaux et cloud (union), pousse vers le cloud ceux qui n'y sont pas. */
export async function syncBadges(userId: string): Promise<OwnedBadges> {
  const local = readBadges()
  const { data, error } = await supabase.from(table('badges')).select('badge,earned_at').eq('user_id', userId)
  if (error) return local
  const cloud: OwnedBadges = Object.fromEntries(((data as { badge: string; earned_at: string }[] | null) ?? []).map((row) => [row.badge, row.earned_at]))
  const merged: OwnedBadges = { ...cloud }
  for (const [id, at] of Object.entries(local)) if (!merged[id] || at < merged[id]) merged[id] = at
  const missing = Object.keys(local).filter((id) => !cloud[id])
  for (const id of missing) await pushBadges(userId, [id], local[id])
  writeBadges(merged)
  return merged
}
