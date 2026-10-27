import type { Question } from '../types/quiz'

/** Réordonne une série pour que deux questions consécutives ne portent pas sur le même sujet (la même ligne du CSV : l'or, la
 *  Jamaïque…) et, si possible, pas sur la même catégorie. Algorithme glouton et déterministe : à chaque pas, la première question
 *  restante (dans l'ordre reçu) qui diffère de la précédente par le sujet ET la catégorie ; à défaut, par le sujet seul ; à défaut
 *  (il n'en reste que sur le même sujet), la première restante. L'ordre reçu — un mélange, ou la série du défi du jour — est donc
 *  conservé au maximum, et la même entrée donne toujours la même sortie. Une question sans sujet (classement, association) ne
 *  « collisionne » jamais sur le sujet. */
export function spreadQuestions(questions: Question[]): Question[] {
  const used = new Array<boolean>(questions.length).fill(false)
  const result: Question[] = []
  let head = 0
  while (result.length < questions.length) {
    while (used[head]) head += 1
    const previous = result[result.length - 1]
    const sameSubject = (question: Question) => Boolean(previous?.subject) && question.subject === previous.subject
    let pick = -1
    let bySubject = -1
    for (let index = head; index < questions.length; index += 1) {
      if (used[index] || sameSubject(questions[index])) continue
      if (bySubject < 0) bySubject = index
      if (!previous || questions[index].category !== previous.category) { pick = index; break }
    }
    if (pick < 0) pick = bySubject >= 0 ? bySubject : head
    used[pick] = true
    result.push(questions[pick])
  }
  return result
}
