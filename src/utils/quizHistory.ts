import type { AnswersByQuestion, Category, Question } from '../types/quiz'
import type { CategoryWeekHeatmap, ChartGroup, MissedQuestion, QuestionResultPayload, QuestionResultRow, QuizRecords, QuizResultPayload, QuizResultRow, RadarPoint, StatBucket } from '../types/history'
import { isCorrect } from '../components/ResultPage'
import type { GameMode } from '../components/QuizPage'
import { storageKey, table } from '../config'
import { supabase } from './supabase'

const quizKey = () => storageKey('quiz-results')
const questionKey = () => storageKey('question-results')

function readRows<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeRows<T>(key: string, rows: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    /* quota dépassé ou navigation privée : l'historique n'est pas bloquant */
  }
}

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

function aggregate(questions: Question[], answers: AnswersByQuestion, keyOf: (question: Question) => string): Record<string, StatBucket> {
  const buckets: Record<string, StatBucket> = {}
  questions.forEach((question) => {
    const key = keyOf(question)
    const bucket = buckets[key] ?? { correct: 0, total: 0 }
    bucket.total += 1
    if (isCorrect(question, answers[question.id])) bucket.correct += 1
    buckets[key] = bucket
  })
  return buckets
}

/** Construit le résumé d'une partie terminée, prêt à être enregistré. On fige les **ids** de
 * catégorie (noms de colonnes, indépendants de la langue), pas les libellés : l'historique ne
 * se retrouve pas en langue mixte si l'utilisateur change de langue. Les libellés sont résolus
 * à l'affichage (`HistoryPage`). Les anciennes lignes (libellés FR) : repli sur la clé telle quelle. */
export function buildQuizResultPayload(questions: Question[], answers: AnswersByQuestion, _categories: Category[], elapsedSeconds: number, quizTitle: string, mode: GameMode = 'classic'): QuizResultPayload {
  const correctQuestions = questions.filter((question) => isCorrect(question, answers[question.id]))
  const earnedPoints = correctQuestions.reduce((sum, question) => sum + question.points, 0)
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0)

  return {
    quiz_title: quizTitle,
    mode,
    score: totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0,
    earned_points: earnedPoints,
    total_points: totalPoints,
    correct_count: correctQuestions.length,
    elapsed_seconds: elapsedSeconds,
    question_count: questions.length,
    categories: Array.from(new Set(questions.map((question) => question.category))),
    by_category: aggregate(questions, answers, (question) => question.category),
    by_type: aggregate(questions, answers, (question) => question.type),
    by_difficulty: aggregate(questions, answers, (question) => question.difficulty),
  }
}

async function pushQuizRowsToCloud(userId: string, rows: QuizResultRow[]): Promise<void> {
  if (!rows.length) return
  const { error } = await supabase.from(table('quiz_results')).upsert(rows.map((row) => ({ ...row, user_id: userId })), { onConflict: 'id' })
  if (error) throw error
}

async function fetchCloudQuizRows(userId: string): Promise<QuizResultRow[]> {
  const { data, error } = await supabase
    .from(table('quiz_results'))
    .select('id,quiz_title,mode,score,earned_points,total_points,correct_count,elapsed_seconds,question_count,categories,by_category,by_type,by_difficulty,created_at')
    .eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

/** Best-effort : une partie non enregistrée ne doit jamais empêcher l'utilisateur de voir son résultat.
 *  Toujours écrit en local ; poussé aussi vers le cloud si connecté (id partagé, donc rejouable sans doublon). */
export async function saveQuizResult(payload: QuizResultPayload, userId?: string | null): Promise<void> {
  const row: QuizResultRow = { ...payload, id: newId(), created_at: new Date().toISOString() }
  const rows = readRows<QuizResultRow>(quizKey())
  rows.unshift(row)
  writeRows(quizKey(), rows)
  if (userId) await pushQuizRowsToCloud(userId, [row]).catch(() => {})
}

type LegacyQuizResultRow = QuizResultRow & { themes?: string[]; by_theme?: Record<string, StatBucket>; mode?: GameMode; correct_count?: number }

/** Reprend les anciennes lignes d'historique (`themes`/`by_theme`, absence de `mode`/`correct_count`
 * — toutes antérieures au contre-la-montre/sans-faute, donc forcément « classique ») sous les noms actuels. */
function normalizeRow(row: LegacyQuizResultRow): QuizResultRow {
  const withCategories = row.by_category !== undefined ? row : { ...row, categories: row.categories ?? row.themes ?? [], by_category: row.by_theme ?? {} }
  return { ...withCategories, mode: withCategories.mode ?? 'classic', correct_count: withCategories.correct_count ?? 0 }
}

/** Historique local (par navigateur), fusionné avec le cloud si connecté : les parties déjà
 *  jouées sur un autre appareil apparaissent ici, et celles jouées ici (hors-ligne ou avant la
 *  première connexion) sont poussées vers le cloud — chaque appareil converge vers l'union. */
export async function fetchQuizHistory(userId?: string | null): Promise<QuizResultRow[]> {
  const local = readRows<LegacyQuizResultRow>(quizKey()).map(normalizeRow)
  if (!userId) return local.sort((a, b) => b.created_at.localeCompare(a.created_at))
  try {
    const cloud = await fetchCloudQuizRows(userId)
    const cloudIds = new Set(cloud.map((row) => row.id))
    const localOnly = local.filter((row) => !cloudIds.has(row.id))
    if (localOnly.length) await pushQuizRowsToCloud(userId, localOnly).catch(() => {})
    const merged = [...cloud, ...localOnly]
    writeRows(quizKey(), merged)
    return merged.sort((a, b) => b.created_at.localeCompare(a.created_at))
  } catch {
    return local.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
}

/** Une ligne par question de la partie, pour pouvoir repérer plus tard les questions ratées de façon récurrente. */
export function buildQuestionResultPayloads(questions: Question[], answers: AnswersByQuestion, quizTitle: string): QuestionResultPayload[] {
  return questions.map((question) => ({
    quiz_title: quizTitle,
    question_id: question.id,
    // `topic` (libellé neutre) plutôt que l'énoncé joué : la liste « à retravailler » reste lisible
    // (pas de marqueur `___`, pas d'affirmation V/F, pas d'énoncé image générique).
    question_text: question.topic ?? question.question,
    correct: isCorrect(question, answers[question.id]),
  }))
}

async function pushQuestionRowsToCloud(userId: string, rows: QuestionResultRow[]): Promise<void> {
  if (!rows.length) return
  const { error } = await supabase.from(table('question_results')).upsert(rows.map((row) => ({ ...row, user_id: userId })), { onConflict: 'id' })
  if (error) throw error
}

async function fetchCloudQuestionRows(userId: string): Promise<QuestionResultRow[]> {
  const { data, error } = await supabase
    .from(table('question_results'))
    .select('id,quiz_title,question_id,question_text,correct,created_at')
    .eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

/** Best-effort, comme `saveQuizResult`. */
export async function saveQuestionResults(payloads: QuestionResultPayload[], userId?: string | null): Promise<void> {
  if (!payloads.length) return
  const created_at = new Date().toISOString()
  const newRows = payloads.map((payload) => ({ ...payload, id: newId(), created_at }))
  const rows = readRows<QuestionResultRow>(questionKey())
  rows.push(...newRows)
  writeRows(questionKey(), rows)
  if (userId) await pushQuestionRowsToCloud(userId, newRows).catch(() => {})
}

/** Même logique de fusion que `fetchQuizHistory`. */
export async function fetchQuestionResults(userId?: string | null): Promise<QuestionResultRow[]> {
  const local = readRows<QuestionResultRow>(questionKey())
  if (!userId) return local
  try {
    const cloud = await fetchCloudQuestionRows(userId)
    const cloudIds = new Set(cloud.map((row) => row.id))
    const localOnly = local.filter((row) => !cloudIds.has(row.id))
    if (localOnly.length) await pushQuestionRowsToCloud(userId, localOnly).catch(() => {})
    const merged = [...cloud, ...localOnly]
    writeRows(questionKey(), merged)
    return merged
  } catch {
    return local
  }
}

/** Regroupe les résultats par question pour un quiz donné, ne garde que celles ratées au moins une fois, triées de la plus problématique à la moins. */
export function computeMissedQuestions(rows: QuestionResultRow[], quizTitle: string): MissedQuestion[] {
  const byQuestion = new Map<string, MissedQuestion>()
  rows.filter((row) => row.quiz_title === quizTitle).forEach((row) => {
    const entry = byQuestion.get(row.question_id) ?? { questionId: row.question_id, questionText: row.question_text, attempts: 0, wrongCount: 0 }
    entry.attempts += 1
    if (!row.correct) entry.wrongCount += 1
    entry.questionText = row.question_text
    byQuestion.set(row.question_id, entry)
  })
  return Array.from(byQuestion.values()).filter((entry) => entry.wrongCount > 0).sort((a, b) => b.wrongCount - a.wrongCount)
}

/** `rows` peut être dans n'importe quel ordre — seuls les agrégats comptent ici.
 * `bestScore`/`averageScore` ne portent que sur le mode classique (le `%` n'est pas comparable
 * entre modes : `correct_count` est la métrique pertinente pour contre-la-montre et sans-faute). */
export function computeRecords(rows: QuizResultRow[]): QuizRecords {
  if (!rows.length) return { gamesPlayed: 0, bestScore: 0, averageScore: 0, totalPlaytimeSeconds: 0, bestTimeAttackCorrect: 0, bestStreak: 0 }
  const classicRows = rows.filter((row) => row.mode === 'classic')
  const timeAttackRows = rows.filter((row) => row.mode === 'timeAttack')
  const noMistakeRows = rows.filter((row) => row.mode === 'noMistake')
  return {
    gamesPlayed: rows.length,
    bestScore: classicRows.length ? Math.max(...classicRows.map((row) => row.score)) : 0,
    averageScore: classicRows.length ? Math.round(classicRows.reduce((sum, row) => sum + row.score, 0) / classicRows.length) : 0,
    totalPlaytimeSeconds: rows.reduce((sum, row) => sum + row.elapsed_seconds, 0),
    bestTimeAttackCorrect: timeAttackRows.length ? Math.max(...timeAttackRows.map((row) => row.correct_count)) : 0,
    bestStreak: noMistakeRows.length ? Math.max(...noMistakeRows.map((row) => row.correct_count)) : 0,
  }
}

/** Cumule les buckets `correct`/`total` d'une clé (par ex. `by_category`) sur l'ensemble de l'historique. */
/** Lundi (heure locale) de la semaine contenant `date`, au format `YYYY-MM-DD` — clé de regroupement hebdomadaire. */
export function weekStartKey(date: Date): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

/** Croise catégories (lignes) et semaines (colonnes) : pour chaque case, le cumul correct/total des parties de
 * cette semaine, `null` si la catégorie n'a pas été jouée. Seules les `maxWeeks` dernières semaines comportant au
 * moins une partie sont gardées (pas de colonnes vides), et les `maxCategories` catégories les plus jouées — au-delà,
 * la grille devient illisible. */
export function computeCategoryWeekHeatmap(rows: QuizResultRow[], maxWeeks = 12, maxCategories = 15): CategoryWeekHeatmap {
  const weekKeys = Array.from(new Set(rows.map((row) => weekStartKey(new Date(row.created_at))))).sort().slice(-maxWeeks)
  const byCategory = new Map<string, Map<string, StatBucket>>()
  rows.forEach((row) => {
    const week = weekStartKey(new Date(row.created_at))
    if (!weekKeys.includes(week)) return
    Object.entries(row.by_category).forEach(([category, bucket]) => {
      const weeks = byCategory.get(category) ?? new Map<string, StatBucket>()
      const cell = weeks.get(week) ?? { correct: 0, total: 0 }
      cell.correct += bucket.correct
      cell.total += bucket.total
      weeks.set(week, cell)
      byCategory.set(category, weeks)
    })
  })
  const totalOf = (weeks: Map<string, StatBucket>) => Array.from(weeks.values()).reduce((sum, cell) => sum + cell.total, 0)
  const all = Array.from(byCategory.entries()).sort(([, a], [, b]) => totalOf(b) - totalOf(a))
  return {
    weeks: weekKeys,
    categories: all.slice(0, maxCategories).map(([key, weeks]) => ({ key, cells: weekKeys.map((week) => weeks.get(week) ?? null) })),
    truncated: all.length > maxCategories,
  }
}

export function sumBuckets(rows: QuizResultRow[], pick: (row: QuizResultRow) => Record<string, StatBucket>): Record<string, StatBucket> {
  const totals: Record<string, StatBucket> = {}
  rows.forEach((row) => {
    Object.entries(pick(row)).forEach(([key, bucket]) => {
      const total = totals[key] ?? { correct: 0, total: 0 }
      total.correct += bucket.correct
      total.total += bucket.total
      totals[key] = total
    })
  })
  return totals
}

/** Convertit des buckets cumulés en groupes prêts pour `PieChart`. `passLabel`/`failLabel`
 * viennent de l'UI (i18n) ; défauts FR pour les appels hors composant / tests. */
export function bucketsToChartGroups(
  buckets: Record<string, StatBucket>,
  labelOf: (key: string) => string,
  passLabel = 'Réussi',
  failLabel = 'Raté',
): ChartGroup[] {
  return Object.entries(buckets).map(([key, bucket]) => ({
    key,
    label: labelOf(key),
    data: [
      { label: passLabel, value: bucket.correct, color: '#34d399' },
      { label: failLabel, value: bucket.total - bucket.correct, color: '#fb7185' },
    ].filter((slice) => slice.value > 0),
  }))
}

/** Un point par clé (taux de réussite en %), pour `RadarChart` — contrairement à
 *  `bucketsToChartGroups`, une seule valeur par axe plutôt qu'un couple réussi/raté. */
export function bucketsToRadarPoints(buckets: Record<string, StatBucket>, labelOf: (key: string) => string): RadarPoint[] {
  return Object.entries(buckets).map(([key, bucket]) => ({
    key,
    label: labelOf(key),
    percent: bucket.total ? Math.round((bucket.correct / bucket.total) * 100) : 0,
  }))
}
