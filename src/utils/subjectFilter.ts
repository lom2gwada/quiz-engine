import type { Question } from '../types/quiz'
import type { GenSchema, Row } from './quizGenerator'

/** La question reste-t-elle proposée quand seuls les sujets `selected` sont retenus ? Sélection vide = tous. Une question sur un
 *  seul sujet (`subject`) : ce sujet doit être retenu. Une question de groupe (classement, association : `subjects`) : tous ses
 *  sujets doivent l'être — sinon elle ferait entrer des territoires que le joueur a écartés. */
export function matchesSubjects(question: Question, selected: ReadonlySet<string>): boolean {
  if (!selected.size) return true
  if (question.subject) return selected.has(question.subject)
  if (question.subjects?.length) return question.subjects.every((subject) => selected.has(subject))
  return true
}

export interface SubjectChip {
  /** Valeur brute (FR canonique) de la colonne. */
  value: string
  /** Sujets (valeurs FR canoniques) qui ont cette valeur. */
  subjects: string[]
}

/** Valeurs distinctes d'une colonne, chacune avec les sujets qui la portent (colonne multivaleur : un sujet figure sous chaque valeur).
 *  Les cases vides sont ignorées ; tri par nombre de sujets décroissant puis par valeur. */
export function subjectChips(rows: Row[], schema: GenSchema, column: string): SubjectChip[] {
  const separator = schema.columns[column]?.multivalueSeparator
  const byValue = new Map<string, string[]>()
  for (const row of rows) {
    const subject = row[schema.subjectColumn] ?? ''
    const raw = (row[column] ?? '').trim()
    if (!subject || !raw) continue
    const values = separator ? raw.split(separator).map((value) => value.trim()).filter(Boolean) : [raw]
    for (const value of values) byValue.set(value, [...(byValue.get(value) ?? []), subject])
  }
  return Array.from(byValue, ([value, subjects]) => ({ value, subjects })).sort((a, b) => b.subjects.length - a.subjects.length || a.value.localeCompare(b.value))
}

/** Bascule d'un raccourci : si tous ses sujets sont déjà retenus on les retire, sinon on les ajoute. */
export function toggleSubjects(selected: string[], subjects: string[]): string[] {
  const all = subjects.every((subject) => selected.includes(subject))
  return all ? selected.filter((subject) => !subjects.includes(subject)) : [...selected, ...subjects.filter((subject) => !selected.includes(subject))]
}
