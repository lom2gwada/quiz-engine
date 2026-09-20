import { storageKey, table } from '../config'
import type { QuizResultRow, StatBucket } from '../types/history'
import type { BlitzStats } from './blitz'
import { supabase } from './supabase'

export type BadgeId = 'streak10' | 'flawless20' | 'globe10' | 'blitz50' | 'record1'

/** Ordre d'affichage. Nom et condition : messages `badge.<id>` et `badge.<id>.hint`. */
export const BADGES: { id: BadgeId; icon: string }[] = [
  { id: 'streak10', icon: '🔥' },
  { id: 'flawless20', icon: '🛡️' },
  { id: 'globe10', icon: '🌍' },
  { id: 'blitz50', icon: '⚡' },
  { id: 'record1', icon: '🏆' },
]

export interface BadgeContext {
  /** Bilan de la partie si c'est un blitz (défi du jour compris), sinon `null`. */
  stats: BlitzStats | null
  /** Partie de blitz « libre » (ni classique, ni défi du jour). */
  freeBlitz: boolean
  /** A battu son record personnel de blitz avec cette partie. */
  brokeRecord: boolean
  /** Historique AVANT cette partie. */
  history: QuizResultRow[]
  /** Bilan par catégorie de cette partie. */
  currentByCategory: Record<string, StatBucket>
  /** Catégories du quiz (les identifiants). */
  categoryIds: string[]
}

/** Tous les badges que ce contexte satisfait (y compris ceux déjà obtenus : c'est à l'appelant de filtrer). */
export function earnedBadges(ctx: BadgeContext): BadgeId[] {
  const earned: BadgeId[] = []
  const { stats } = ctx
  if (stats && stats.bestStreak >= 10) earned.push('streak10')
  if (stats && stats.played >= 20 && stats.correct === stats.played) earned.push('flawless20')

  if (ctx.categoryIds.length) {
    const correct: Record<string, number> = {}
    for (const row of ctx.history) for (const [category, bucket] of Object.entries(row.by_category)) correct[category] = (correct[category] ?? 0) + bucket.correct
    for (const [category, bucket] of Object.entries(ctx.currentByCategory)) correct[category] = (correct[category] ?? 0) + bucket.correct
    if (ctx.categoryIds.every((id) => (correct[id] ?? 0) >= 10)) earned.push('globe10')
  }

  const blitzGames = ctx.history.filter((row) => row.mode === 'blitz').length + (ctx.freeBlitz ? 1 : 0)
  if (blitzGames >= 50) earned.push('blitz50')
  if (ctx.brokeRecord) earned.push('record1')
  return earned
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
