import type { AnswersByQuestion, Question } from '../types/quiz'
import type { QuizResultRow } from '../types/history'
import { isCorrect } from '../components/ResultPage'

/** Une partie blitz : au plus ce nombre de questions (moins si la sélection de catégories en offre moins, ou si les erreurs
 *  la terminent avant), chacune limitée à ce nombre de secondes. */
export const BLITZ_QUESTION_COUNT = 100
export const BLITZ_SECONDS = 10
/** Erreurs (mauvaise réponse ou temps écoulé) qui terminent la partie : à la 3e, on passe au bilan. Fixe pour tous. */
export const BLITZ_MAX_ERRORS = 3

/** Le blitz ne joue que des questions à 4 choix dont une seule bonne réponse (les 4 cases carrées) : un classement,
 *  une saisie ou une estimation ne se répondent pas en quelques secondes d'un clic. */
export function isBlitzEligible(question: Question): boolean {
  return question.type === 'qcm'
    && !question.content.multiple
    && question.content.answers.length === 4
    && question.content.answers.filter((answer) => answer.isCorrect).length === 1
}

/** Les parties blitz jouées avant l'introduction des 3 erreurs (2026-09-20) n'avaient pas de limite d'erreurs : leur score n'est
 *  pas comparable, on ne les compte ni au classement (cf. vues `*_leaderboard_blitz`) ni pour le record personnel. */
export const BLITZ_LIVES_SINCE = '2026-09-20T00:28:47Z'

export interface BlitzStats {
  played: number
  correct: number
  /** Plus longue suite de bonnes réponses consécutives. */
  bestStreak: number
}

/** Bilan d'une partie : `shown` = les questions jouées, dans l'ordre. */
export function blitzStats(shown: Question[], answers: AnswersByQuestion): BlitzStats {
  let correct = 0
  let bestStreak = 0
  let run = 0
  for (const question of shown) {
    if (isCorrect(question, answers[question.id])) { correct += 1; run += 1; bestStreak = Math.max(bestStreak, run) } else run = 0
  }
  return { played: shown.length, correct, bestStreak }
}

/** Meilleur nombre de bonnes réponses en blitz sur ce quiz (parties avec 3 erreurs seulement), `null` s'il n'y en a pas. */
export function previousBestBlitz(rows: QuizResultRow[], quizTitle: string): number | null {
  const scores = rows.filter((row) => row.mode === 'blitz' && row.quiz_title === quizTitle && row.created_at >= BLITZ_LIVES_SINCE).map((row) => row.correct_count)
  return scores.length ? Math.max(...scores) : null
}

export const blitzPool = (questions: Question[]): Question[] => questions.filter(isBlitzEligible)
