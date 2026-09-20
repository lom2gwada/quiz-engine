import { useEffect } from 'react'
import { useT } from '../i18n'
import type { BlitzStats } from '../utils/blitz'
import { playVictory } from '../utils/sound'

/** `previousBest` : `undefined` = comparaison en cours de chargement, `null` = première partie blitz de ce quiz. */
export type BlitzSummaryData = BlitzStats & { previousBest?: number | null }

/** Bilan d'une partie blitz : bonnes réponses, meilleure série, et où l'on en est par rapport à son record personnel. */
export function BlitzSummary({ data }: { data: BlitzSummaryData }) {
  const t = useT()
  const { played, correct, bestStreak, previousBest } = data
  const isRecord = typeof previousBest === 'number' && correct > previousBest
  useEffect(() => { if (isRecord) playVictory() }, [isRecord])

  let recordLine = ''
  if (previousBest === null) recordLine = t('blitz.summary.first')
  else if (typeof previousBest === 'number') {
    if (correct > previousBest) recordLine = t('blitz.summary.record', { prev: previousBest })
    else if (correct === previousBest) recordLine = t('blitz.summary.tie', { prev: previousBest })
    else recordLine = t('blitz.summary.behind', { prev: previousBest, gap: previousBest - correct })
  }

  return <div className="blitz-summary">
    <p>{t('blitz.summary.correct', { correct, played })}</p>
    <p>{t('blitz.summary.streak', { n: bestStreak })}</p>
    {recordLine && <p className={isRecord ? 'blitz-summary-record is-record' : 'blitz-summary-record'}>{recordLine}</p>}
  </div>
}
