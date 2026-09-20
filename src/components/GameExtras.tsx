import { useEffect } from 'react'
import { useLocale, useT } from '../i18n'
import { blitzScore } from '../utils/blitz'
import { formatNumber } from '../utils/number'
import { BADGES, type BadgeId } from '../utils/badges'
import type { BlitzStats } from '../utils/blitz'
import type { DailyRow } from '../utils/dailyChallenge'
import { playVictory } from '../utils/sound'
import { BlitzSummary, type BlitzSummaryData } from './BlitzSummary'

export type DailySummaryData = BlitzStats & { guest: boolean; bonus?: number; rank?: { rank: number; total: number } | null }

function DailySummary({ data }: { data: DailySummaryData }) {
  const t = useT()
  const locale = useLocale()
  const bonus = data.bonus ?? 0
  return <div className="blitz-summary">
    <p><strong>{t('daily.summary.title')}</strong></p>
    <p>{t('blitz.summary.correct', { correct: data.correct, played: data.played })}</p>
    <p>{t('blitz.summary.streak', { n: data.bestStreak })}</p>
    <p>{t('blitz.summary.score', { score: formatNumber(blitzScore(data, bonus), locale, 1), bonus: formatNumber(bonus, locale, 1) })}</p>
    {data.rank && <p className="blitz-summary-record is-record">{t('daily.rank', { rank: data.rank.rank, total: data.rank.total })}</p>}
    {data.guest && <p>{t('daily.guest')}</p>}
    <p>{t('daily.comeBack')}</p>
  </div>
}

function NewBadges({ ids }: { ids: BadgeId[] }) {
  const t = useT()
  useEffect(() => { if (ids.length) playVictory() }, [ids.length])
  return <div className="blitz-summary new-badges">
    {ids.map((id) => <p key={id} className="blitz-summary-record is-record">
      {BADGES.find((badge) => badge.id === id)?.icon} {t('badge.new', { name: t(`badge.${id}`) })}
    </p>)}
  </div>
}

/** Ce qui s'ajoute sous le score d'une partie : bilan blitz, bilan du défi du jour, badges obtenus. */
export function GameExtras({ blitz, daily, newBadges }: { blitz?: BlitzSummaryData | null; daily?: DailySummaryData | null; newBadges: BadgeId[] }) {
  if (!blitz && !daily && !newBadges.length) return null
  return <>
    {blitz && <BlitzSummary data={blitz} />}
    {daily && <DailySummary data={daily} />}
    {newBadges.length > 0 && <NewBadges ids={newBadges} />}
  </>
}

export type { DailyRow }
