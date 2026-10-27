import { useState } from 'react'
import type { Difficulty, Question, Quiz } from '../types/quiz'
import type { GenSchema, Row } from '../utils/quizGenerator'
import type { DataI18n } from '../i18n/data'
import { useT } from '../i18n'
import { formatNumber } from '../utils/number'
import { ConfirmBar } from './ConfirmBar'
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
  /** Questions que donnerait ce schéma avec cette graine, sans rien appliquer. */
  onPreview: (schema: GenSchema, seed: string) => { questions: Question[]; error: string }
  /** « Générer le quiz » enregistre aussi ces réglages comme défaut de tous les joueurs (admin sur le jeu de données partagé). */
  sharedDefault: boolean
  fileError: string
  genError: string
}

export function QuizContentPage({ quiz, dataset, onBack, onCsvChange, onGenerate, onRegenerate, onPreview, sharedDefault, fileError, genError }: QuizContentPageProps) {
  const t = useT()
  // Régénérer et importer remplacent les questions : on dit lesquelles et ce qui est conservé avant d'agir.
  const [pending, setPending] = useState<{ kind: 'regenerate' } | { kind: 'import'; file: File } | null>(null)
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
    {dataset && <button type="button" className="secondary regenerate-btn" onClick={() => setPending({ kind: 'regenerate' })}>{t('content.regenerate')}</button>}
    {pending?.kind === 'regenerate' && <ConfirmBar title={t('confirm.regenerate.title')} confirmLabel={t('confirm.regenerate.confirm')} onConfirm={() => { setPending(null); onRegenerate() }} onCancel={() => setPending(null)}>
      <p>{t('confirm.regenerate.body')}</p>
    </ConfirmBar>}
    <div className="quiz-import">
      <label className="file-input">{t('content.importCsv')}<input type="file" accept="text/csv,.csv,.tsv,text/plain" onChange={(event) => {
        const file = event.target.files?.[0]
        event.target.value = '' // rechoisir le même fichier après une annulation doit redéclencher l'événement
        if (file) setPending({ kind: 'import', file })
      }} /></label>
      {pending?.kind === 'import' && <ConfirmBar title={t('confirm.import.title', { file: pending.file.name })} confirmLabel={t('confirm.import.confirm')} onConfirm={() => { const { file } = pending; setPending(null); onCsvChange(file) }} onCancel={() => setPending(null)}>
        <p>{t('confirm.import.body')}</p>
      </ConfirmBar>}
      {fileError && <p className="alert" role="alert">{fileError}</p>}
    </div>
    {dataset && <GeneratorPanel key={Object.keys(dataset.rows[0] ?? {}).join(',')} rows={dataset.rows} schema={dataset.schema} i18n={dataset.i18n} onGenerate={onGenerate} onPreview={onPreview} sharedDefault={sharedDefault} totalQuestions={quiz.questions.length} error={genError} />}
    <h3 className="stats-group-title">{t('content.distribution')}</h3>
    <div className="stats-grid">
      <PieChart title={t('content.categoriesChart', { n: total })} data={byCategory} />
      <PieChart title={t('content.typesChart', { n: total })} data={byType} />
      <PieChart title={t('content.difficultyChart', { n: total })} data={byDifficulty} />
    </div>
    {dataset && <DataTable rows={dataset.rows} schema={dataset.schema} i18n={dataset.i18n} />}
  </section>
}
