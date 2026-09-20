import type { Question } from '../types/quiz'

/** Une partie blitz : au plus ce nombre de questions (moins si la sélection de catégories en offre moins), chacune limitée à ce nombre de secondes. */
export const BLITZ_QUESTION_COUNT = 100
export const BLITZ_SECONDS = 10

/** Le blitz ne joue que des questions à 4 choix dont une seule bonne réponse (les 4 cases carrées) : un classement,
 *  une saisie ou une estimation ne se répondent pas en quelques secondes d'un clic. */
export function isBlitzEligible(question: Question): boolean {
  return question.type === 'qcm'
    && !question.content.multiple
    && question.content.answers.length === 4
    && question.content.answers.filter((answer) => answer.isCorrect).length === 1
}

export const blitzPool = (questions: Question[]): Question[] => questions.filter(isBlitzEligible)
