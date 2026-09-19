// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BooleanQuestion, Category, QCMQuestion } from '../types/quiz'
import type { QuestionResultRow, QuizResultRow } from '../types/history'
import { bucketsToChartGroups, bucketsToRadarPoints, buildQuestionResultPayloads, buildQuizResultPayload, computeMissedQuestions, computeRecords, sumBuckets } from './quizHistory'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

const categories: Category[] = [{ id: 'histoire', label: 'Histoire' }, { id: 'geo', label: 'Géographie' }]

const qcm: QCMQuestion = {
  id: 'q1', category: 'histoire', difficulty: 'easy', tags: [], explanation: '', points: 1,
  type: 'qcm', question: 'Q ?',
  content: { multiple: false, answers: [{ id: 'a', label: 'A', isCorrect: true }, { id: 'b', label: 'B', isCorrect: false }] },
}
const bool: BooleanQuestion = {
  id: 'q2', category: 'geo', difficulty: 'medium', tags: [], explanation: '', points: 2,
  type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true },
}

describe('buildQuizResultPayload', () => {
  it('computes the score and point totals', () => {
    const payload = buildQuizResultPayload([qcm, bool], { q1: ['a'], q2: ['true'] }, categories, 42, 'Culture générale')
    expect(payload.score).toBe(100)
    expect(payload.earned_points).toBe(3)
    expect(payload.total_points).toBe(3)
    expect(payload.elapsed_seconds).toBe(42)
    expect(payload.question_count).toBe(2)
    expect(payload.quiz_title).toBe('Culture générale')
  })

  it('computes a partial score when some answers are wrong', () => {
    const payload = buildQuizResultPayload([qcm, bool], { q1: ['b'], q2: ['true'] }, categories, 0, 'Culture générale')
    expect(payload.score).toBe(67)
    expect(payload.earned_points).toBe(2)
  })

  it('stores category ids (language-independent) and dedupes them', () => {
    const payload = buildQuizResultPayload([qcm, bool], {}, categories, 0, 'Culture générale')
    expect(payload.categories).toEqual(['histoire', 'geo'])
  })

  it('aggregates correctness by category id, type and difficulty', () => {
    const payload = buildQuizResultPayload([qcm, bool], { q1: ['a'], q2: ['false'] }, categories, 0, 'Culture générale')
    expect(payload.by_category).toEqual({ histoire: { correct: 1, total: 1 }, geo: { correct: 0, total: 1 } })
    expect(payload.by_type).toEqual({ qcm: { correct: 1, total: 1 }, boolean: { correct: 0, total: 1 } })
    expect(payload.by_difficulty).toEqual({ easy: { correct: 1, total: 1 }, medium: { correct: 0, total: 1 } })
  })

  it('returns a score of 0 for an empty question set', () => {
    const payload = buildQuizResultPayload([], {}, categories, 0, 'Culture générale')
    expect(payload.score).toBe(0)
    expect(payload.categories).toEqual([])
  })

  it('tags the payload with the given quiz title', () => {
    expect(buildQuizResultPayload([qcm], {}, categories, 0, 'Test technique IT').quiz_title).toBe('Test technique IT')
  })

  it('defaults to classic mode and counts correct questions regardless of points', () => {
    const payload = buildQuizResultPayload([qcm, bool], { q1: ['a'], q2: ['true'] }, categories, 0, 'Culture générale')
    expect(payload.mode).toBe('classic')
    expect(payload.correct_count).toBe(2)
  })

  it('tags the payload with the given mode', () => {
    expect(buildQuizResultPayload([qcm], { q1: ['a'] }, categories, 0, 'Culture générale', 'timeAttack').mode).toBe('timeAttack')
  })
})

function row(overrides: Partial<QuizResultRow>): QuizResultRow {
  return {
    id: '1', created_at: '2026-01-01T00:00:00Z', quiz_title: 'Culture générale', mode: 'classic', score: 50, earned_points: 1, total_points: 2,
    correct_count: 1, elapsed_seconds: 60, question_count: 2, categories: [], by_category: {}, by_type: {}, by_difficulty: {},
    ...overrides,
  }
}

describe('computeRecords', () => {
  it('returns zeroed records for an empty history', () => {
    expect(computeRecords([])).toEqual({ gamesPlayed: 0, bestScore: 0, averageScore: 0, totalPlaytimeSeconds: 0, bestTimeAttackCorrect: 0, bestStreak: 0 })
  })

  it('counts games played across every mode', () => {
    expect(computeRecords([row({}), row({ mode: 'timeAttack' }), row({ mode: 'noMistake' })]).gamesPlayed).toBe(3)
  })

  it('finds the best classic score regardless of row order', () => {
    expect(computeRecords([row({ score: 40 }), row({ score: 90 }), row({ score: 70 })]).bestScore).toBe(90)
  })

  it('rounds the average classic score', () => {
    expect(computeRecords([row({ score: 40 }), row({ score: 41 })]).averageScore).toBe(41)
  })

  it('sums total playtime across all games and modes', () => {
    expect(computeRecords([row({ elapsed_seconds: 30 }), row({ mode: 'timeAttack', elapsed_seconds: 45 })]).totalPlaytimeSeconds).toBe(75)
  })

  it('ignores non-classic rows for bestScore/averageScore', () => {
    const records = computeRecords([row({ mode: 'timeAttack', score: 100 }), row({ mode: 'noMistake', score: 100 })])
    expect(records.bestScore).toBe(0)
    expect(records.averageScore).toBe(0)
  })

  it('finds the best time-attack correct count, ignoring other modes', () => {
    const records = computeRecords([
      row({ mode: 'timeAttack', correct_count: 12 }),
      row({ mode: 'timeAttack', correct_count: 30 }),
      row({ mode: 'classic', correct_count: 99 }),
    ])
    expect(records.bestTimeAttackCorrect).toBe(30)
  })

  it('finds the longest no-mistake streak, ignoring other modes', () => {
    const records = computeRecords([
      row({ mode: 'noMistake', correct_count: 5 }),
      row({ mode: 'noMistake', correct_count: 18 }),
      row({ mode: 'timeAttack', correct_count: 99 }),
    ])
    expect(records.bestStreak).toBe(18)
  })
})

describe('sumBuckets', () => {
  it('sums correct/total across every row for the same key', () => {
    const rows = [
      row({ by_category: { Histoire: { correct: 1, total: 2 } } }),
      row({ by_category: { Histoire: { correct: 2, total: 3 } } }),
    ]
    expect(sumBuckets(rows, (r) => r.by_category)).toEqual({ Histoire: { correct: 3, total: 5 } })
  })

  it('keeps separate keys separate', () => {
    const rows = [
      row({ by_category: { Histoire: { correct: 1, total: 1 } } }),
      row({ by_category: { Géographie: { correct: 0, total: 1 } } }),
    ]
    expect(sumBuckets(rows, (r) => r.by_category)).toEqual({
      Histoire: { correct: 1, total: 1 },
      Géographie: { correct: 0, total: 1 },
    })
  })

  it('returns an empty object for an empty history', () => {
    expect(sumBuckets([], (r) => r.by_category)).toEqual({})
  })
})

describe('bucketsToChartGroups', () => {
  it('splits each bucket into a Réussi/Raté pie slice pair', () => {
    const groups = bucketsToChartGroups({ Histoire: { correct: 3, total: 5 } }, (key) => key)
    expect(groups).toEqual([{
      key: 'Histoire', label: 'Histoire',
      data: [{ label: 'Réussi', value: 3, color: '#34d399' }, { label: 'Raté', value: 2, color: '#fb7185' }],
    }])
  })

  it('omits a slice when its value is zero', () => {
    const perfect = bucketsToChartGroups({ Histoire: { correct: 4, total: 4 } }, (key) => key)
    expect(perfect[0].data).toEqual([{ label: 'Réussi', value: 4, color: '#34d399' }])
  })

  it('applies the label resolver to each key', () => {
    const groups = bucketsToChartGroups({ qcm: { correct: 1, total: 1 } }, () => 'QCM')
    expect(groups[0].label).toBe('QCM')
  })
})

describe('bucketsToRadarPoints', () => {
  it('computes a success percentage per key, rounded', () => {
    const points = bucketsToRadarPoints({ qcm: { correct: 1, total: 3 } }, (key) => key)
    expect(points).toEqual([{ key: 'qcm', label: 'qcm', percent: 33 }])
  })

  it('returns 0% for an empty bucket rather than dividing by zero', () => {
    const points = bucketsToRadarPoints({ qcm: { correct: 0, total: 0 } }, (key) => key)
    expect(points[0].percent).toBe(0)
  })

  it('applies the label resolver to each key', () => {
    const points = bucketsToRadarPoints({ hard: { correct: 2, total: 2 } }, () => 'Difficile')
    expect(points[0]).toEqual({ key: 'hard', label: 'Difficile', percent: 100 })
  })

  it('keeps one point per key, in insertion order', () => {
    const points = bucketsToRadarPoints({ easy: { correct: 1, total: 1 }, hard: { correct: 0, total: 1 } }, (key) => key)
    expect(points.map((p) => p.key)).toEqual(['easy', 'hard'])
  })
})

describe('buildQuestionResultPayloads', () => {
  it('tags each question with its own correctness', () => {
    const payloads = buildQuestionResultPayloads([qcm, bool], { q1: ['a'], q2: ['false'] }, 'Culture générale')
    expect(payloads).toEqual([
      { quiz_title: 'Culture générale', question_id: 'q1', question_text: 'Q ?', correct: true },
      { quiz_title: 'Culture générale', question_id: 'q2', question_text: 'Vrai ou faux ?', correct: false },
    ])
  })

  it('marks an unanswered question as incorrect', () => {
    const [payload] = buildQuestionResultPayloads([qcm], {}, 'Culture générale')
    expect(payload.correct).toBe(false)
  })

  it('prefers the neutral topic label over the played prompt when present', () => {
    const withTopic: QCMQuestion = { ...qcm, topic: 'Capitale de la Jamaïque' }
    const [payload] = buildQuestionResultPayloads([withTopic], {}, 'Culture générale')
    expect(payload.question_text).toBe('Capitale de la Jamaïque')
    // sans topic : on retombe sur l'énoncé
    expect(buildQuestionResultPayloads([qcm], {}, 'Culture générale')[0].question_text).toBe('Q ?')
  })

  it('returns an empty array for no questions', () => {
    expect(buildQuestionResultPayloads([], {}, 'Culture générale')).toEqual([])
  })
})

function questionRow(overrides: Partial<QuestionResultRow>): QuestionResultRow {
  return {
    id: '1', created_at: '2026-01-01T00:00:00Z', quiz_title: 'Culture générale',
    question_id: 'q1', question_text: 'Q ?', correct: true,
    ...overrides,
  }
}

describe('computeMissedQuestions', () => {
  it('counts wrong attempts per question', () => {
    const rows = [
      questionRow({ correct: false }),
      questionRow({ correct: true }),
      questionRow({ correct: false }),
    ]
    const [missed] = computeMissedQuestions(rows, 'Culture générale')
    expect(missed).toEqual({ questionId: 'q1', questionText: 'Q ?', attempts: 3, wrongCount: 2 })
  })

  it('excludes questions that were always answered correctly', () => {
    const rows = [questionRow({ correct: true }), questionRow({ correct: true })]
    expect(computeMissedQuestions(rows, 'Culture générale')).toEqual([])
  })

  it('sorts by wrong count, most missed first', () => {
    const rows = [
      questionRow({ question_id: 'q1', correct: false }),
      questionRow({ question_id: 'q2', correct: false }),
      questionRow({ question_id: 'q2', correct: false }),
    ]
    const missed = computeMissedQuestions(rows, 'Culture générale')
    expect(missed.map((entry) => entry.questionId)).toEqual(['q2', 'q1'])
  })

  it('ignores rows from other quizzes', () => {
    const rows = [questionRow({ quiz_title: 'Autre quiz', correct: false })]
    expect(computeMissedQuestions(rows, 'Culture générale')).toEqual([])
  })

  it('returns an empty array for no history', () => {
    expect(computeMissedQuestions([], 'Culture générale')).toEqual([])
  })
})

// Table mock reproduisant la forme utilisée par quizHistory.ts : `.select().eq()` et `.upsert()`
// renvoient chacun une promesse `{ data, error }`, comme le client Supabase réel.
function mockTable({ selectResult = { data: [] as unknown, error: null as unknown }, upsertResult = { data: null as unknown, error: null as unknown } } = {}) {
  return {
    select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue(selectResult) })),
    upsert: vi.fn().mockResolvedValue(upsertResult),
  }
}

describe('saveQuizResult / fetchQuizHistory (sync cloud)', () => {
  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    // resetModules jette aussi la config du moteur : on la redéclare sur la nouvelle instance.
    ;(await import('../config')).configureEngine((await import('../testing/setup')).TEST_CONFIG)
  })

  it('reste 100% local quand personne n’est connecté (comportement inchangé)', async () => {
    const { supabase } = await import('./supabase')
    const { saveQuizResult, fetchQuizHistory } = await import('./quizHistory')
    await saveQuizResult(buildQuizResultPayload([qcm], { q1: ['a'] }, categories, 10, 'Culture générale'))
    expect(supabase.from).not.toHaveBeenCalled()
    const rows = await fetchQuizHistory(null)
    expect(rows).toHaveLength(1)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('pousse la partie vers le cloud à la sauvegarde quand connecté', async () => {
    const { supabase } = await import('./supabase')
    const table = mockTable()
    vi.mocked(supabase.from).mockReturnValue(table as never)
    const { saveQuizResult } = await import('./quizHistory')
    await saveQuizResult(buildQuizResultPayload([qcm], { q1: ['a'] }, categories, 10, 'Culture générale'), 'user-1')
    expect(supabase.from).toHaveBeenCalledWith('test_quiz_results')
    expect(table.upsert).toHaveBeenCalledWith([expect.objectContaining({ user_id: 'user-1', quiz_title: 'Culture générale' })], { onConflict: 'id' })
  })

  it('fusionne l’historique local et celui du cloud (union par id)', async () => {
    const cloudRow = row({ id: 'cloud-1', quiz_title: 'Depuis un autre appareil' })
    const table = mockTable({ selectResult: { data: [cloudRow], error: null } })
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.from).mockReturnValue(table as never)
    localStorage.setItem('test-app:quiz-results', JSON.stringify([row({ id: 'local-1' })]))
    const { fetchQuizHistory } = await import('./quizHistory')
    const rows = await fetchQuizHistory('user-1')
    expect(rows.map((r) => r.id).sort()).toEqual(['cloud-1', 'local-1'])
  })

  it('pousse vers le cloud les parties locales absentes du cloud, pas celles déjà présentes', async () => {
    const cloudRow = row({ id: 'cloud-1' })
    const table = mockTable({ selectResult: { data: [cloudRow], error: null } })
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.from).mockReturnValue(table as never)
    localStorage.setItem('test-app:quiz-results', JSON.stringify([row({ id: 'cloud-1' }), row({ id: 'local-only' })]))
    const { fetchQuizHistory } = await import('./quizHistory')
    await fetchQuizHistory('user-1')
    expect(table.upsert).toHaveBeenCalledTimes(1)
    const [pushed] = vi.mocked(table.upsert).mock.calls[0]
    expect((pushed as { id: string }[]).map((r) => r.id)).toEqual(['local-only'])
  })

  it('conserve l’historique local si le cloud échoue', async () => {
    const table = mockTable({ selectResult: { data: null, error: new Error('network down') } })
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.from).mockReturnValue(table as never)
    localStorage.setItem('test-app:quiz-results', JSON.stringify([row({ id: 'local-1' })]))
    const { fetchQuizHistory } = await import('./quizHistory')
    const rows = await fetchQuizHistory('user-1')
    expect(rows.map((r) => r.id)).toEqual(['local-1'])
  })
})

describe('saveQuestionResults / fetchQuestionResults (sync cloud)', () => {
  beforeEach(async () => {
    localStorage.clear()
    vi.resetModules()
    // resetModules jette aussi la config du moteur : on la redéclare sur la nouvelle instance.
    ;(await import('../config')).configureEngine((await import('../testing/setup')).TEST_CONFIG)
  })

  it('fusionne les réponses locales et celles du cloud (union par id)', async () => {
    const table = mockTable({ selectResult: { data: [questionRow({ id: 'cloud-1' })], error: null } })
    const { supabase } = await import('./supabase')
    vi.mocked(supabase.from).mockReturnValue(table as never)
    localStorage.setItem('test-app:question-results', JSON.stringify([questionRow({ id: 'local-1' })]))
    const { fetchQuestionResults } = await import('./quizHistory')
    const rows = await fetchQuestionResults('user-1')
    expect(rows.map((r) => r.id).sort()).toEqual(['cloud-1', 'local-1'])
  })
})
