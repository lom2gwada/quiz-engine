import { useLocale, useT } from '../i18n'
import { BADGES, type OwnedBadges } from '../utils/badges'

/** Les badges : obtenus en couleur (avec leur date), les autres grisés avec leur condition. */
export function BadgesPanel({ owned }: { owned: OwnedBadges }) {
  const t = useT()
  const locale = useLocale()
  const count = BADGES.filter((badge) => owned[badge.id]).length
  return <section className="badges-panel">
    <h3>{t('badge.title')} <span className="badges-count">{count} / {BADGES.length}</span></h3>
    <ul className="badge-grid">
      {BADGES.map(({ id, icon }) => {
        const at = owned[id]
        return <li key={id} className={at ? 'badge is-earned' : 'badge is-locked'}>
          <span className="badge-icon" aria-hidden="true">{icon}</span>
          <span className="badge-name">{t(`badge.${id}`)}</span>
          <span className="badge-hint">{at ? new Date(at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : t(`badge.${id}.hint`)}</span>
        </li>
      })}
    </ul>
  </section>
}
