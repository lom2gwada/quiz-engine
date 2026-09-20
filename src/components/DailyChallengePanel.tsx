import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { BLITZ_MAX_ERRORS, BLITZ_SECONDS } from '../utils/blitz'
import { DAILY_QUESTION_COUNT, dailyRank, dailyStreak, fetchDailyLeaderboard, fetchMyDaily, readDailyLocal, type DailyRow, type MyDailyRow } from '../utils/dailyChallenge'
import { formatDuration } from '../utils/time'

/** Carte « Défi du jour » de l'accueil : état de la tentative, série de jours, classement du jour. `refreshKey` change
 *  quand une tentative vient d'être jouée, pour recharger. */
export function DailyChallengePanel({ userId, day, onPlay, refreshKey, error }: { userId: string | null; day: string; onPlay: () => void; refreshKey: number; error: boolean }) {
  const t = useT()
  const [mine, setMine] = useState<MyDailyRow[] | null>(null)
  const [board, setBoard] = useState<DailyRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setBoard(null)
    fetchDailyLeaderboard(day).then((rows) => { if (!cancelled) setBoard(rows) })
    if (userId) fetchMyDaily(userId).then((rows) => { if (!cancelled) setMine(rows) })
    else setMine([])
    return () => { cancelled = true }
  }, [userId, day, refreshKey])

  const local = readDailyLocal(day)
  const today = mine?.find((row) => row.day === day)
  const finished = Boolean(local?.finished || today?.finished_at)
  const started = finished || Boolean(local || today)
  const myBoardRow = userId ? board?.find((row) => row.user_id === userId) : undefined
  const correct = myBoardRow?.correct_count ?? today?.correct_count ?? local?.correct ?? 0
  const played = myBoardRow?.played ?? today?.played ?? local?.played ?? 0
  const rank = userId && board ? dailyRank(board, userId) : null
  const streak = dailyStreak([...(mine ?? []).filter((row) => row.finished_at).map((row) => row.day), ...(local?.finished ? [day] : [])], day)

  return <section className="daily-panel">
    <div className="daily-head">
      <h3>⚡ {t('daily.title')}</h3>
      {streak > 0 && <span className="daily-streak">🔥 {t('daily.streak', { n: streak })}</span>}
    </div>
    {!started && <>
      <p>{t('daily.intro', { count: DAILY_QUESTION_COUNT, seconds: BLITZ_SECONDS, lives: BLITZ_MAX_ERRORS })}</p>
      <button type="button" onClick={onPlay}>{t('daily.play')}</button>
    </>}
    {started && !finished && <p>{t('daily.abandoned')}</p>}
    {finished && <>
      <p><strong>{t('daily.done', { correct, played })}</strong>{rank ? ` — ${t('daily.rank', { rank: rank.rank, total: rank.total })}` : ''}</p>
      <p>{t('daily.comeBack')}</p>
    </>}
    {error && <p className="alert" role="alert">{t('daily.error')}</p>}
    {!userId && <p className="daily-note">{t('daily.guest')}</p>}
    <h4 className="stats-group-title">{t('daily.leaderboard')}</h4>
    {board === null && <p>{t('common.loading')}</p>}
    {board && !board.length && <p>{t('daily.empty')}</p>}
    {board && board.length > 0 && <ul className="leaderboard-list">
      {board.slice(0, 10).map((row, index) => <li key={row.user_id} className={row.user_id === userId ? 'leaderboard-item leaderboard-item-self' : 'leaderboard-item'}>
        <span className="leaderboard-rank">{index + 1}</span>
        <span className="leaderboard-avatar">{row.avatar}</span>
        <div className="leaderboard-main">
          <span className="leaderboard-pseudo">{row.pseudo}</span>
          <span className="leaderboard-details">⏱ {formatDuration(row.elapsed_seconds)}</span>
        </div>
        <span className="leaderboard-score">{t(row.correct_count === 1 ? 'leaderboard.correctCount.one' : 'leaderboard.correctCount.other', { n: row.correct_count })}</span>
      </li>)}
    </ul>}
  </section>
}
