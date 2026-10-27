import { useEffect, useState } from 'react'
import type { Locale } from '../i18n/locale'
import { useT } from '../i18n'
import { speakSentences, speechDiagnostics, speechSupported, stopSpeaking } from '../utils/speech'

/** Bouton « Écouter » / « Arrêter » : lit le texte à voix haute (synthèse vocale du navigateur). Caché si le
 *  navigateur n'en a pas ou s'il n'y a rien à dire. La lecture s'arrête quand les phrases changent ou au démontage.
 *  `label` : texte du bouton au repos (« Écouter » par défaut) ; l'icône 🗣️ le distingue du bouton des effets sonores (🔔 / 🔕). */
export function SpeakButton({ sentences, locale, label }: { sentences: string[]; locale: Locale; label?: string }) {
  const t = useT()
  const [speaking, setSpeaking] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const key = sentences.join('\n')

  useEffect(() => () => { stopSpeaking(); setSpeaking(false); setFailed(null) }, [key, locale])

  if (!speechSupported() || !sentences.length) return null

  const toggle = () => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return }
    setFailed(null)
    setSpeaking(true)
    speakSentences(sentences, locale, () => setSpeaking(false), (code) => setFailed(`${code} · ${speechDiagnostics(locale)}`))
  }

  return <>
    <button type="button" className="secondary fiche-speak" onClick={toggle} aria-pressed={speaking} title={t('fiche.speakTitle')}>
      {speaking ? `⏹ ${t('fiche.speakStop')}` : `🗣️ ${label ?? t('fiche.speak')}`}
    </button>
    {failed && <span className="dictation-hint" role="status">{t('fiche.speakError')} ({failed})</span>}
  </>
}
