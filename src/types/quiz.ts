export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuestionType = 'qcm' | 'text' | 'code' | 'ordering' | 'boolean' | 'cloze' | 'matching' | 'numeric'

export interface Category {
  id: string
  label: string
}

export interface AnswerOption {
  id: string
  label: string
  isCorrect: boolean
}

export interface QCMContent {
  multiple: boolean
  answers: AnswerOption[]
}

export interface TextContent {
  expectedAnswers: string[]
  caseSensitive: boolean
}

export interface CodeContent {
  language: string
  snippet: string
  answers: AnswerOption[]
}

export interface OrderingItem {
  id: string
  label: string
}

export interface OrderingContent {
  items: OrderingItem[]
  correctOrder: string[]
}

export interface BooleanContent {
  isTrue: boolean
}

/** Le champ `question` doit contenir un marqueur de trou (`___`) que ClozeQuestion remplace par un champ de saisie. */
export type ClozeContent = TextContent

export interface MatchingItem {
  id: string
  label: string
}

export interface MatchingContent {
  left: MatchingItem[]
  right: MatchingItem[]
  correctPairs: Record<string, string>
}

export interface NumericContent {
  min: number
  max: number
  step: number
  target: number
  tolerance: number
  unit?: string
  /** Une année : on n'y met pas de séparateur de milliers à l'affichage. */
  isYear?: boolean
}

export interface BaseQuestion {
  id: string
  category: string
  difficulty: Difficulty
  question: string
  /** Libellé neutre de la « chose testée » (« Capitale de la Jamaïque »), pour les listes de
   *  révision où l'énoncé joué (marqueur `___`, image générique, affirmation V/F) est inadapté.
   *  Optionnel : les quiz importés sans ce champ retombent sur `question`. */
  topic?: string
  /** Sujet de la question (ex. « Cuba ») quand elle en a un seul — permet un lien « Voir la fiche ».
   *  **Valeur FR canonique** (clé de fiche + d'historique), même en anglais. Absent pour les
   *  questions de groupe (classement, association). */
  subject?: string
  /** Sujet traduit pour l'affichage (« Jamaica ») ; absent s'il est identique à `subject`. */
  subjectLabel?: string
  tags: string[]
  explanation: string
  points: number
  /** Optionnel, sur n'importe quel type de question — pas un type dédié : évite de dupliquer la logique QCM/texte libre. */
  imageUrl?: string
  imageAlt?: string
  /** SVG inline d'une silhouette (contour de territoire) — affiché comme une image, recoloré via `currentColor`. */
  shapeSvg?: string
}

export interface QCMQuestion extends BaseQuestion {
  type: 'qcm'
  content: QCMContent
}

export interface TextQuestion extends BaseQuestion {
  type: 'text'
  content: TextContent
}

export interface CodeQuestion extends BaseQuestion {
  type: 'code'
  content: CodeContent
}

export interface OrderingQuestion extends BaseQuestion {
  type: 'ordering'
  content: OrderingContent
}

export interface BooleanQuestion extends BaseQuestion {
  type: 'boolean'
  content: BooleanContent
}

export interface ClozeQuestion extends BaseQuestion {
  type: 'cloze'
  content: ClozeContent
}

export interface MatchingQuestion extends BaseQuestion {
  type: 'matching'
  content: MatchingContent
}

export interface NumericQuestion extends BaseQuestion {
  type: 'numeric'
  content: NumericContent
}

export type Question = QCMQuestion | TextQuestion | CodeQuestion | OrderingQuestion | BooleanQuestion | ClozeQuestion | MatchingQuestion | NumericQuestion

export interface Quiz {
  version: string
  metadata: { title: string; author: string; createdAt: string; description?: string }
  categories: Category[]
  questions: Question[]
}

export type UserAnswer = string[] | string
export type AnswersByQuestion = Record<string, UserAnswer>
