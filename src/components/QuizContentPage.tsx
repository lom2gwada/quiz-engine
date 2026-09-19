import type { Difficulty, Quiz } from '../types/quiz'
import type { GenSchema, Row } from '../utils/quizGenerator'
import type { DataI18n } from '../i18n/data'
import { useT } from '../i18n'
import { formatNumber } from '../utils/number'
import { DataTable } from './DataTable'
import { GeneratorPanel } from './GeneratorPanel'
import { PieChart } from './PieChart'
import { QUESTION_TYPES, difficultyLabel, typeLabel } from './QuizPage'

const SLICE_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#22d3ee', '#f472b6', '#94a3b8']
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const DIFFICULTY_COLORS: Record<Difficulty, string> = { easy: '#34d399', medium: '#38bdf8', hard: '#fb7185' }

interface QuizContentPageProps {
  quiz: Quiz
  dataset: { rows: Row[]; schema: GenSchema; i18n?: DataI18n } | null
  onBack: () => void
  onCsvChange: (file?: File) => void
  onGenerate: (schema: GenSchema, seed: string) => void
  onRegenerate: () => void
  fileError: string
  genError: string
}

export function QuizContentPage({ quiz, dataset, onBack, onCsvChange, onGenerate, onRegenerate, fileError, genError }: QuizContentPageProps) {
  const t = useT()
  const total = formatNumber(quiz.questions.length)

  const byCategory = quiz.categories
    .map((category, index) => ({
      label: category.label,
      value: quiz.questions.filter((question) => question.category === category.id).length,
      color: SLICE_COLORS[index % SLICE_COLORS.length],
    }))
    .filter((slice) => slice.value > 0)

  const byType = QUESTION_TYPES
    .map((type, index) => ({
      label: typeLabel(type, t),
      value: quiz.questions.filter((question) => question.type === type).length,
      color: SLICE_COLORS[index % SLICE_COLORS.length],
    }))
    .filter((slice) => slice.value > 0)

  const byDifficulty = DIFFICULTIES
    .map((difficulty) => ({
      label: difficultyLabel(difficulty, t),
      value: quiz.questions.filter((question) => question.difficulty === difficulty).length,
      color: DIFFICULTY_COLORS[difficulty],
    }))
    .filter((slice) => slice.value > 0)

  return <section className="stats-page">
    <div className="stats-header">
      <h2>{t('content.title')}</h2>
      <button type="button" className="secondary" onClick={onBack}>{t('common.back')}</button>
    </div>
    {quiz.metadata.description && <p className="quiz-description">{quiz.metadata.description}</p>}
    {dataset && <button type="button" className="secondary regenerate-btn" onClick={onRegenerate}>{t('content.regenerate')}</button>}
    <div className="quiz-import">
      <label className="file-input">{t('content.importCsv')}<input type="file" accept="text/csv,.csv,.tsv,text/plain" onChange={(event) => onCsvChange(event.target.files?.[0])} /></label>
      {fileError && <p className="alert" role="alert">{fileError}</p>}
    </div>
    {dataset && <GeneratorPanel key={Object.keys(dataset.rows[0] ?? {}).join(',')} rows={dataset.rows} schema={dataset.schema} i18n={dataset.i18n} onGenerate={onGenerate} error={genError} />}
    <h3 className="stats-group-title">{t('content.distribution')}</h3>
    <div className="stats-grid">
      <PieChart title={t('content.categoriesChart', { n: total })} data={byCategory} />
      <PieChart title={t('content.typesChart', { n: total })} data={byType} />
      <PieChart title={t('content.difficultyChart', { n: total })} data={byDifficulty} />
    </div>
    {dataset && <DataTable rows={dataset.rows} schema={dataset.schema} i18n={dataset.i18n} />}
  </section>
}
