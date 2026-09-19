import type { Quiz, Question } from '../types/quiz'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

/** Valide le contrat JSON avant de l'utiliser dans l'application. */
export function parseQuiz(value: unknown): Quiz {
  if (!isRecord(value) || typeof value.version !== 'string' || !isRecord(value.metadata)) {
    throw new Error('Racine invalide : version et metadata sont requises.')
  }
  const { metadata, questions } = value
  // `themes` est l'ancien nom de `categories` : on l'accepte encore à l'import de quiz JSON existants.
  const categories = value.categories ?? value.themes
  if (
    typeof metadata.title !== 'string' ||
    typeof metadata.author !== 'string' ||
    typeof metadata.createdAt !== 'string' ||
    (metadata.description !== undefined && typeof metadata.description !== 'string') ||
    !Array.isArray(categories) ||
    !categories.every((category) => isRecord(category) && typeof category.id === 'string' && typeof category.label === 'string') ||
    !Array.isArray(questions)
  ) {
    throw new Error('Metadata, categories ou questions ne respecte pas le schéma attendu.')
  }

  const parsedQuestions = questions.map(parseQuestion)
  const categoryIds = new Set(categories.map((category) => (category as { id: string }).id))
  if (parsedQuestions.some((question) => !categoryIds.has(question.category))) {
    throw new Error('Chaque question doit référencer une catégorie existante.')
  }
  return { version: value.version, metadata: metadata as Quiz['metadata'], categories: categories as Quiz['categories'], questions: parsedQuestions }
}

function parseQuestion(value: unknown): Question {
  if (!isRecord(value) || !isRecord(value.content)) throw new Error('Question ou contenu invalide.')
  const { id, type, difficulty, question, topic, subject, subjectLabel, tags, explanation, points, content, imageUrl, imageAlt, shapeSvg } = value
  const category = value.category ?? value.theme // `theme` : ancien nom accepté à l'import
  if (
    typeof id !== 'string' || typeof category !== 'string' || typeof question !== 'string' ||
    typeof explanation !== 'string' || typeof points !== 'number' || points < 0 || !hasStrings(tags) ||
    !['easy', 'medium', 'hard'].includes(String(difficulty)) ||
    (topic !== undefined && typeof topic !== 'string') ||
    (subject !== undefined && typeof subject !== 'string') ||
    (subjectLabel !== undefined && typeof subjectLabel !== 'string') ||
    (imageUrl !== undefined && (typeof imageUrl !== 'string' || !imageUrl)) ||
    (imageAlt !== undefined && typeof imageAlt !== 'string') ||
    (shapeSvg !== undefined && (typeof shapeSvg !== 'string' || !/^<svg[\s>]/.test(shapeSvg)))
  ) throw new Error(`Question « ${String(id ?? '?')} » invalide.`)

  const base = {
    id, category, difficulty: difficulty as Question['difficulty'], question, tags, explanation, points,
    topic: topic as string | undefined,
    subject: subject as string | undefined,
    subjectLabel: subjectLabel as string | undefined,
    imageUrl: imageUrl as string | undefined, imageAlt: imageAlt as string | undefined,
    shapeSvg: shapeSvg as string | undefined,
  }
  if (type === 'qcm' && typeof content.multiple === 'boolean' && validAnswers(content.answers)) {
    return { ...base, type, content: { multiple: content.multiple, answers: content.answers } }
  }
  if (type === 'code' && typeof content.language === 'string' && typeof content.snippet === 'string' && validAnswers(content.answers)) {
    return { ...base, type, content: { language: content.language, snippet: content.snippet, answers: content.answers } }
  }
  if (type === 'text' && hasStrings(content.expectedAnswers) && typeof content.caseSensitive === 'boolean') {
    return { ...base, type, content: { expectedAnswers: content.expectedAnswers, caseSensitive: content.caseSensitive } }
  }
  if (type === 'ordering' && validItems(content.items) && hasStrings(content.correctOrder)) {
    const ids = new Set(content.items.map((item) => item.id))
    if (content.correctOrder.length === content.items.length && content.correctOrder.every((id) => ids.has(id))) {
      return { ...base, type, content: { items: content.items, correctOrder: content.correctOrder } }
    }
  }
  if (type === 'boolean' && typeof content.isTrue === 'boolean') {
    return { ...base, type, content: { isTrue: content.isTrue } }
  }
  if (type === 'cloze' && hasStrings(content.expectedAnswers) && typeof content.caseSensitive === 'boolean') {
    if (!/_{3,}/.test(question)) throw new Error(`Question « ${id} » : le texte à trous doit contenir un marqueur "___".`)
    return { ...base, type, content: { expectedAnswers: content.expectedAnswers, caseSensitive: content.caseSensitive } }
  }
  if (type === 'matching' && validItems(content.left) && validItems(content.right) && isRecord(content.correctPairs)) {
    const leftIds = new Set(content.left.map((item) => item.id))
    const rightIds = new Set(content.right.map((item) => item.id))
    const correctPairs = content.correctPairs
    const pairKeys = Object.keys(correctPairs)
    if (
      pairKeys.length === content.left.length &&
      pairKeys.every((leftId) => leftIds.has(leftId) && typeof correctPairs[leftId] === 'string' && rightIds.has(correctPairs[leftId] as string))
    ) {
      return { ...base, type, content: { left: content.left, right: content.right, correctPairs: correctPairs as Record<string, string> } }
    }
  }
  if (
    type === 'numeric' && typeof content.min === 'number' && typeof content.max === 'number' && typeof content.step === 'number' &&
    typeof content.target === 'number' && typeof content.tolerance === 'number' && (content.unit === undefined || typeof content.unit === 'string')
  ) {
    if (content.min >= content.max || content.target < content.min || content.target > content.max || content.tolerance < 0) {
      throw new Error(`Question « ${id} » : bornes ou tolérance du curseur invalides.`)
    }
    return { ...base, type, content: { min: content.min, max: content.max, step: content.step, target: content.target, tolerance: content.tolerance, unit: content.unit as string | undefined, isYear: content.isYear === true } }
  }
  throw new Error(`Le contenu de la question « ${id} » ne correspond pas au type « ${String(type)} ».`)
}

function validAnswers(value: unknown): value is { id: string; label: string; isCorrect: boolean }[] {
  return Array.isArray(value) && value.every((answer) =>
    isRecord(answer) && typeof answer.id === 'string' && typeof answer.label === 'string' && typeof answer.isCorrect === 'boolean',
  )
}

function validItems(value: unknown): value is { id: string; label: string }[] {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.label === 'string')
}
