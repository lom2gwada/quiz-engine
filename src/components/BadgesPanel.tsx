import { useEffect, useState } from 'react'
import { useLocale, useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { BADGES, badgeProgress, type BadgeId, type BadgeProgress, type OwnedBadges } from '../utils/badges'
import { dailyKey, fetchMyDaily, finishedLocalDays } from '../utils/dailyChallenge'
import { fetchQuizHistory } from '../utils/quizHistory'

/** Libellé de la progression d'un badge verrouillé, par badge (les trois globe-trotters partagent le leur). */
const PROGRESS_KEY: Partial<Record<BadgeId, MessageKey>> = {
  streak10: 'badge.progress.streak',
  globe10: 'badge.progress.globe',
  globe25: 'badge.progress.globe',
  globe50: 'badge.progress.globe',
  blitz50: 'badge.progress.blitz',
  daily7: 'badge.progress.days',
  classic7: 'badge.progress.days',
  allModes: 'badge.progress.modes',
}

/** Progression de chaque badge à seuil, calculée depuis l'historique ; vide tant qu'il n'est pas chargé (ou sans catégories). */
function useBadgeProgress(userId: string | null | undefined, categoryIds: string[]): Partial<Record<BadgeId, BadgeProgress>> {
  const [progress, setProgress] = useState<Partial<Record<BadgeId, BadgeProgress>>>({})
  const key = categoryIds.join(',')
  useEffect(() => {
    if (!key) return
    let cancelled = false
    Promise.all([fetchQuizHistory(userId), userId ? fetchMyDaily(userId).catch(() => []) : Promise.resolve([])]).then(([history, mine]) => {
      if (cancelled) return
      const dailyDays = [...finishedLocalDays(), ...mine.filter((row) => row.finished_at).map((row) => row.day)]
      setProgress(badgeProgress({ history, categoryIds: key.split(','), dailyDays, today: dailyKey() }))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [userId, key])
  return progress
}

/** Les badges : obtenus d'abord, en couleur et avec leur date ; puis les verrouillés, avec leur condition et où l'on en est. */
export function BadgesPanel({ owned, userId, categoryIds = [] }: { owned: OwnedBadges; userId?: string | null; categoryIds?: string[] }) {
  const t = useT()
  const locale = useLocale()
  const progress = useBadgeProgress(userId, categoryIds)
  const count = BADGES.filter((badge) => owned[badge.id]).length
  // Tri stable : obtenus d'abord, chaque groupe gardant l'ordre de BADGES.
  const ordered = [...BADGES].sort((a, b) => Number(Boolean(owned[b.id])) - Number(Boolean(owned[a.id])))
  return <section className="badges-panel">
    <h3>{t('badge.title')} <span className="badges-count">{count} / {BADGES.length}</span></h3>
    <ul className="badge-grid">
      {ordered.map(({ id, icon }) => {
        const at = owned[id]
        const step = !at ? progress[id] : undefined
        const stepKey = PROGRESS_KEY[id]
        const stepText = step && stepKey ? t(stepKey, { current: step.current, target: step.target }) : ''
        return <li key={id} className={at ? 'badge is-earned' : 'badge is-locked'}>
          <span className="badge-icon" aria-hidden="true">{icon}</span>
          <span className="badge-name">{t(`badge.${id}`)}</span>
          <span className="badge-hint">{at ? new Date(at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : t(`badge.${id}.hint`)}</span>
          {step && stepText && <>
            <span className="badge-bar" role="progressbar" aria-label={t(`badge.${id}`)} aria-valuetext={stepText} aria-valuemin={0} aria-valuemax={step.target} aria-valuenow={step.current}>
              <span className="badge-bar-fill" style={{ width: `${(step.current / step.target) * 100}%` }} />
            </span>
            <span className="badge-progress">{stepText}</span>
          </>}
        </li>
      })}
    </ul>
  </section>
}
