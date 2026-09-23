import { describe, expect, it, vi } from 'vitest'
import type { Question } from '../types/quiz'
import type { QuizResultRow } from '../types/history'
import { addBadges, earnedBadges, playedAllModesToday, type BadgeContext } from './badges'
import { DAILY_QUESTION_COUNT, dailyKey, dailyRank, dailySeed, dailyStreak, pickDailyIds, selectDaily, type DailyRow } from './dailyChallenge'

vi.mock('./supabase', () => ({ supabase: {} }))

const base = { category: 'c', difficulty: 'easy' as const, tags: [], explanation: '', points: 1 }
const qcm = (id: string, answers = 4): Question => ({
  ...base, id, type: 'qcm', question: 'Q ?',
  content: { multiple: false, answers: Array.from({ length: answers }, (_, i) => ({ id: String(i), label: `O${i}`, isCorrect: i === 0 })) },
})

describe('daily challenge', () => {
  it('uses the UTC date as the day key and the seed', () => {
    expect(dailyKey(new Date('2026-09-20T23:59:59Z'))).toBe('2026-09-20')
    expect(dailyKey(new Date('2026-09-21T00:00:00Z'))).toBe('2026-09-21')
    expect(dailySeed('2026-09-20')).toBe('daily-2026-09-20')
  })

  it('picks the first eligible questions, capped, and finds them again by id', () => {
    const many = Array.from({ length: 30 }, (_, i) => qcm(`q${i}`))
    const withNoise = [qcm('three', 3), ...many]
    const ids = pickDailyIds(withNoise)
    expect(ids).toHaveLength(DAILY_QUESTION_COUNT)
    expect(ids[0]).toBe('q0')
    expect(ids).not.toContain('three')
    const otherOrder = [...many].reverse()
    expect(selectDaily(otherOrder, ids).map((q) => q.id)).toEqual(ids)
    expect(selectDaily(many.slice(0, 5), ids)).toHaveLength(5)
  })

  it('counts consecutive played days back from today, or from yesterday if today is not played', () => {
    expect(dailyStreak(['2026-09-20', '2026-09-19', '2026-09-18', '2026-09-15'], '2026-09-20')).toBe(3)
    expect(dailyStreak(['2026-09-19', '2026-09-18'], '2026-09-20')).toBe(2)
    expect(dailyStreak(['2026-09-17'], '2026-09-20')).toBe(0)
    expect(dailyStreak(['2026-08-31', '2026-09-01'], '2026-09-01')).toBe(2)
    expect(dailyStreak([], '2026-09-20')).toBe(0)
  })

  it('finds a player in the sorted ranking', () => {
    const row = (user_id: string): DailyRow => ({ user_id, pseudo: user_id, avatar: '🙂', correct_count: 1, played: 1, best_streak: 1, elapsed_seconds: 1 })
    const rows = [row('a'), row('b'), row('c')]
    expect(dailyRank(rows, 'b')).toEqual({ rank: 2, total: 3 })
    expect(dailyRank(rows, 'zzz')).toBeNull()
  })
})

describe('badges', () => {
  const blank: BadgeContext = { stats: null, freeBlitz: false, brokeRecord: false, history: [], currentByCategory: {}, categoryIds: ['a', 'b'] }
  const row = (over: Partial<QuizResultRow>): QuizResultRow => ({
    id: 'x', created_at: '2026-09-21T10:00:00Z', quiz_title: 'Q', mode: 'classic', score: 0, earned_points: 0, total_points: 0, correct_count: 0,
    elapsed_seconds: 0, question_count: 0, categories: [], by_category: {}, by_type: {}, by_difficulty: {}, ...over,
  })

  it('awards the streak and flawless badges from the blitz result', () => {
    expect(earnedBadges({ ...blank, stats: { played: 12, correct: 11, bestStreak: 10, points: 0 } })).toEqual(['streak10'])
    expect(earnedBadges({ ...blank, stats: { played: 20, correct: 20, bestStreak: 20, points: 0 } })).toEqual(['streak10', 'flawless20'])
    expect(earnedBadges({ ...blank, stats: { played: 19, correct: 19, bestStreak: 19, points: 0 } })).toEqual(['streak10'])
    expect(earnedBadges({ ...blank, stats: { played: 20, correct: 19, bestStreak: 9, points: 0 } })).toEqual([])
  })

  it('also awards the streak badge from a no-mistake streak, and the flawless badge from a flawless classic game', () => {
    expect(earnedBadges({ ...blank, noMistakeStreak: 9 })).toEqual([])
    expect(earnedBadges({ ...blank, noMistakeStreak: 10 })).toEqual(['streak10'])
    expect(earnedBadges({ ...blank, classicFlawless: false })).toEqual([])
    expect(earnedBadges({ ...blank, classicFlawless: true })).toEqual(['flawless20'])
  })

  it('awards the globetrotter tiers (bronze/silver/gold) once every category reaches the threshold, counting history and this game', () => {
    const history = [row({ by_category: { a: { correct: 6, total: 8 }, b: { correct: 10, total: 10 } } })]
    expect(earnedBadges({ ...blank, history })).toEqual([])
    expect(earnedBadges({ ...blank, history, currentByCategory: { a: { correct: 4, total: 4 } } })).toEqual(['globe10'])
    expect(earnedBadges({ ...blank, history, currentByCategory: { a: { correct: 19, total: 19 }, b: { correct: 15, total: 15 } } })).toEqual(['globe10', 'globe25'])
    expect(earnedBadges({ ...blank, history, currentByCategory: { a: { correct: 44, total: 44 }, b: { correct: 40, total: 40 } } })).toEqual(['globe10', 'globe25', 'globe50'])
    expect(earnedBadges({ ...blank, categoryIds: [], history })).toEqual([])
  })

  it('awards blitz addict at 50 blitz games (this one included) and the record badge on a broken record, in any mode', () => {
    const history = Array.from({ length: 49 }, () => row({ mode: 'blitz' }))
    expect(earnedBadges({ ...blank, history })).toEqual([])
    expect(earnedBadges({ ...blank, history, freeBlitz: true })).toEqual(['blitz50'])
    expect(earnedBadges({ ...blank, brokeRecord: true })).toEqual(['record1'])
  })

  it('awards the full-week badge from 7 consecutive daily-challenge days, and its classic-mode equivalent', () => {
    expect(earnedBadges({ ...blank, dailyStreakDays: 6 })).toEqual([])
    expect(earnedBadges({ ...blank, dailyStreakDays: 7 })).toEqual(['daily7'])
    expect(earnedBadges({ ...blank, dailyStreakDays: 12 })).toEqual(['daily7'])
    expect(earnedBadges({ ...blank, classicStreakDays: 6 })).toEqual([])
    expect(earnedBadges({ ...blank, classicStreakDays: 7 })).toEqual(['classic7'])
  })

  it('awards the variety badge once the 4 modes are played the same day', () => {
    const today = '2026-09-22'
    const history = [row({ mode: 'classic', created_at: `${today}T08:00:00Z` }), row({ mode: 'timeAttack', created_at: `${today}T09:00:00Z` }), row({ mode: 'noMistake', created_at: `${today}T10:00:00Z` })]
    expect(playedAllModesToday(history, 'classic', today)).toBe(false) // manque blitz
    expect(playedAllModesToday(history, 'blitz', today)).toBe(true)
    expect(playedAllModesToday(history, 'blitz', '2026-09-21')).toBe(false) // l'historique est d'hier
    expect(earnedBadges({ ...blank, allModesToday: true })).toEqual(['allModes'])
    expect(earnedBadges({ ...blank, allModesToday: false })).toEqual([])
  })

  it('only adds badges that are not owned yet, keeping the original date', () => {
    const owned = { streak10: '2026-09-01T00:00:00Z' }
    const next = addBadges(owned, ['streak10', 'record1'], '2026-09-20T00:00:00Z')
    expect(next).toEqual({ streak10: '2026-09-01T00:00:00Z', record1: '2026-09-20T00:00:00Z' })
  })
})
