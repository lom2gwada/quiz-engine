import { useEffect, useId, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useT } from '../i18n'
import type { Profile } from '../types/profile'
import { playClick } from '../utils/sound'

export type ProfileMenuTarget = 'profile' | 'history' | 'leaderboard'

interface ProfileMenuProps {
  profile: Profile | null
  session: Session | null
  /** Page affichée : l'entrée correspondante est marquée comme courante. */
  current: string
  onOpen: (target: ProfileMenuTarget) => void
  onSignOut: () => void
}

/** Menu du profil, dans la barre du haut : profil, historique, classement et connexion / déconnexion, à un clic de n'importe
 *  quelle page. Simple liste de boutons qui s'ouvre sous le bouton ; se ferme au clic ailleurs ou sur Échap. */
export function ProfileMenu({ profile, session, current, onOpen, onSignOut }: ProfileMenuProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown) }
  }, [open])

  const choose = (action: () => void) => { playClick(); setOpen(false); action() }
  const item = (target: ProfileMenuTarget, label: string) =>
    <li><button type="button" className="profile-menu-item" aria-current={current === target ? 'page' : undefined} onClick={() => choose(() => onOpen(target))}>{label}</button></li>

  return <div className="profile-menu" ref={rootRef}>
    <button ref={triggerRef} type="button" className="secondary" aria-expanded={open} aria-controls={listId} onClick={() => { playClick(); setOpen(!open) }}>
      {profile?.pseudo ? `${profile.avatar} ${profile.pseudo}` : `👤 ${t('nav.profile')}`} <span aria-hidden="true">▾</span>
    </button>
    {open && <ul id={listId} className="profile-menu-list" aria-label={t('nav.profileMenu')}>
      {item('profile', `👤 ${t('nav.profile')}`)}
      {item('history', `🕓 ${t('nav.history')}`)}
      {item('leaderboard', `🏆 ${t('nav.leaderboard')}`)}
      <li className="profile-menu-sep" role="separator" />
      {session
        ? <li><button type="button" className="profile-menu-item" onClick={() => choose(onSignOut)}>{t('auth.signOut')}</button></li>
        : item('profile', t('auth.signIn'))}
    </ul>}
  </div>
}
