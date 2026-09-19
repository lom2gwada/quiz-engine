import type { GameMode } from '../components/QuizPage'

export interface StatBucket {
  correct: number
  total: number
}

export interface QuizResultPayload {
  quiz_title: string
  mode: GameMode
  score: number
  earned_points: number
  total_points: number
  /** Nombre de questions correctes, indépendant des points — la métrique pertinente pour
   * contre-la-montre (bonnes réponses) et sans-faute (longueur de la série), où le `%` ne l'est pas. */
  correct_count: number
  elapsed_seconds: number
  question_count: number
  categories: string[]
  by_category: Record<string, StatBucket>
  by_type: Record<string, StatBucket>
  by_difficulty: Record<string, StatBucket>
}

export interface QuizResultRow extends QuizResultPayload {
  id: string
  created_at: string
}

export interface QuizRecords {
  gamesPlayed: number
  /** `bestScore`/`averageScore` : mode classique uniquement (le `%` n'est pas comparable entre modes). */
  bestScore: number
  averageScore: number
  totalPlaytimeSeconds: number
  bestTimeAttackCorrect: number
  bestStreak: number
}

export interface ChartGroup {
  key: string
  label: string
  data: { label: string; value: number; color: string }[]
}

export interface RadarPoint {
  key: string
  label: string
  percent: number
}

export interface QuestionResultPayload {
  quiz_title: string
  question_id: string
  question_text: string
  correct: boolean
}

export interface QuestionResultRow extends QuestionResultPayload {
  id: string
  created_at: string
}

export interface MissedQuestion {
  questionId: string
  questionText: string
  attempts: number
  wrongCount: number
}
