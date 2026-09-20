import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { fetchLeaderboard, type LeaderboardRow } from '../utils/leaderboard'
import { formatDuration } from '../utils/time'
import { MODE_ICONS } from './HistoryPage'
import type { GameMode } from './QuizPage'

const MODES: GameMode[] = ['classic', 'timeAttack', 'noMistake', 'blitz']

/** Classement partagé (tous joueurs connectés) d'un quiz, un onglet par mode — cf.
 *  <prefixe>_leaderboard_* (Supabase). Meilleure ligne par joueur, la tienne mise en avant. */
export function LeaderboardPanel({ quizTitle, userId }: { quizTitle: string; userId?: string | null }) {
  const t = useT()
  const [mode, setMode] = useState<GameMode>('classic')
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setRows(null)
    fetchLeaderboard(quizTitle, mode).then((data) => { if (!cancelled) setRows(data) })
    return () => { cancelled = true }
  }, [quizTitle, mode])

  const modeLabel = (m: GameMode) => m === 'timeAttack' ? t('start.mode.timeAttack') : m === 'noMistake' ? t('start.mode.noMistake') : m === 'blitz' ? t('start.mode.blitz') : t('start.mode.classic')
  const valueLabel = (row: LeaderboardRow) => {
    if (mode === 'classic') return `${row.value}%`
    if (mode === 'timeAttack' || mode === 'blitz') return t(row.value === 1 ? 'leaderboard.correctCount.one' : 'leaderboard.correctCount.other', { n: row.value })
    return t(row.value === 1 ? 'quiz.streak.one' : 'quiz.streak.other', { n: row.value })
  }

  return <div className="stats-group">
    <h3 className="stats-group-title">{t('history.leaderboard')}</h3>
    <div className="mode-toggle">
      {MODES.map((m) => (
        <button key={m} type="button" className={m === mode ? 'mode-chip is-active' : 'mode-chip'} onClick={() => setMode(m)}>
          {MODE_ICONS[m]} {modeLabel(m)}
        </button>
      ))}
    </div>
    {!rows && <p>{t('common.loading')}</p>}
    {rows && !rows.length && <p>{t('history.leaderboardEmpty')}</p>}
    {rows && rows.length > 0 && <ul className="leaderboard-list">
      {rows.map((row, index) => <li key={row.user_id} className={row.user_id === userId ? 'leaderboard-item leaderboard-item-self' : 'leaderboard-item'}>
        <span className="leaderboard-rank">{index + 1}</span>
        <span className="leaderboard-avatar">{row.avatar}</span>
        <div className="leaderboard-main">
          <span className="leaderboard-pseudo">{row.pseudo}</span>
          <span className="leaderboard-details">⏱ {formatDuration(row.elapsed_seconds)}</span>
        </div>
        <span className="leaderboard-score">{valueLabel(row)}</span>
      </li>)}
    </ul>}
  </div>
}
