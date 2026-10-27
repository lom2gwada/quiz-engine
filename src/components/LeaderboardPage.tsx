import { useT } from '../i18n'
import { LeaderboardPanel } from './LeaderboardPanel'

/** Le classement seul, sans passer par l'historique : raccourci de l'accueil et du menu du profil. */
export function LeaderboardPage({ onBack, historyKey, userId }: { onBack: () => void; historyKey: string; userId?: string | null }) {
  const t = useT()
  return <section className="stats-page">
    <div className="stats-header">
      <h2>{t('history.leaderboard')}</h2>
      <button type="button" className="secondary" onClick={onBack}>{t('common.back')}</button>
    </div>
    <LeaderboardPanel quizTitle={historyKey} userId={userId} />
  </section>
}
