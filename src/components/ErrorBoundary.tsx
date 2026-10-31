import { Component, type ReactNode } from 'react'
import { LocaleProvider, useT } from '../i18n'
import { resolveLocale } from '../i18n/locale'
import { readLocalePreference } from '../utils/localePreference'
import { isChunkLoadError, reloadForNewVersion } from '../utils/staleChunk'

function Fallback({ stale }: { stale: boolean }) {
  const t = useT()
  return <main className="app-shell app-error" role="alert">
    <h1>{t(stale ? 'error.updated.title' : 'error.generic.title')}</h1>
    <p>{t(stale ? 'error.updated.body' : 'error.generic.body')}</p>
    <button type="button" onClick={() => window.location.reload()}>{t('error.reload')}</button>
  </main>
}

interface State { error: unknown }

/** Dernier filet : une erreur de rendu (ou un fichier de l'appli introuvable après un déploiement) affiche un message
 *  et un bouton « Recharger » plutôt qu'un écran vide. Fichier introuvable = nouvelle version en ligne : on recharge tout seul, une fois. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
    if (isChunkLoadError(error)) reloadForNewVersion()
  }

  render() {
    if (this.state.error === null) return this.props.children
    // Hors de l'AuthGate/App : pas de profil ici, la langue choisie sur l'appareil suffit.
    return <LocaleProvider locale={resolveLocale(readLocalePreference())}><Fallback stale={isChunkLoadError(this.state.error)} /></LocaleProvider>
  }
}
