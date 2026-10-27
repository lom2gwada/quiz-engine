import type { Question } from '../types/quiz'

/** Quelques questions représentatives pour un aperçu : on prend une question de chaque type, puis une deuxième de chaque type…
 *  jusqu'à `count`, dans l'ordre d'apparition (déterministe : même quiz, même aperçu). */
export function sampleQuestions(questions: Question[], count: number): Question[] {
  const byType = new Map<string, Question[]>()
  for (const question of questions) byType.set(question.type, [...(byType.get(question.type) ?? []), question])
  const groups = Array.from(byType.values())
  const sample: Question[] = []
  for (let round = 0; sample.length < count && groups.some((group) => group.length > round); round += 1) {
    for (const group of groups) if (group[round] && sample.length < count) sample.push(group[round])
  }
  return sample
}
