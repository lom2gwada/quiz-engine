import { useEffect } from 'react'
import { useLocale, useT } from '../i18n'
import { blitzScore, type BlitzStats } from '../utils/blitz'
import { formatNumber } from '../utils/number'
import { playVictory } from '../utils/sound'

/** `previousBest` : `undefined` = comparaison en cours de chargement, `null` = première partie blitz de ce quiz. */
export type BlitzSummaryData = BlitzStats & {
  previousBest?: number | null
  /** Bonus de rapidité gagné (points). */
  bonus?: number
  /** Meilleur score blitz précédent (points + bonus) ; même convention que `previousBest`. */
  previousBestScore?: number | null
}

/** Bilan d'une partie blitz : bonnes réponses, meilleure série, et où l'on en est par rapport à son record personnel. */
export function BlitzSummary({ data }: { data: BlitzSummaryData }) {
  const t = useT()
  const locale = useLocale()
  const fmt = (value: number) => formatNumber(value, locale, 1)
  const { played, correct, bestStreak, previousBest, previousBestScore } = data
  const bonus = data.bonus ?? 0
  const score = blitzScore(data, bonus)
  const isScoreRecord = typeof previousBestScore === 'number' && score > previousBestScore
  const isRecord = (typeof previousBest === 'number' && correct > previousBest) || isScoreRecord
  useEffect(() => { if (isRecord) playVictory() }, [isRecord])
  const scoreLine = typeof previousBestScore === 'number'
    ? (isScoreRecord ? t('blitz.summary.scoreRecord', { prev: fmt(previousBestScore) }) : t('blitz.summary.scoreBest', { prev: fmt(previousBestScore) }))
    : ''

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
    <p>{t('blitz.summary.score', { score: fmt(score), bonus: fmt(bonus) })}</p>
    {scoreLine && <p className={isScoreRecord ? 'blitz-summary-record is-record' : 'blitz-summary-record'}>{scoreLine}</p>}
    {recordLine && <p className={typeof previousBest === 'number' && correct > previousBest ? 'blitz-summary-record is-record' : 'blitz-summary-record'}>{recordLine}</p>}
  </div>
}
