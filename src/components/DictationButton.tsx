import { useEffect, useRef, useState } from 'react'
import { useLocale, useT } from '../i18n'
import { dictationSupported, startDictation } from '../utils/dictation'

/** Bouton micro d'un champ texte : une phrase dictée remplace le contenu du champ (que l'utilisateur peut ensuite
 *  corriger à la main). Caché quand le navigateur n'a pas de reconnaissance vocale ou que la langue n'en a pas. */
export function DictationButton({ onText }: { onText: (text: string) => void }) {
  const t = useT()
  const locale = useLocale()
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const supported = dictationSupported(locale)

  useEffect(() => () => stopRef.current?.(), [])

  if (!supported) return null

  const toggle = () => {
    if (listening) { stopRef.current?.(); return }
    setError(null)
    setListening(true)
    stopRef.current = startDictation(locale, {
      onText,
      onEnd: () => { setListening(false); stopRef.current = null },
      onError: (code) => setError(code === 'not-allowed' || code === 'service-not-allowed' ? 'dictation.denied' : code === 'no-speech' ? 'dictation.noSpeech' : 'dictation.failed'),
    })
  }

  return <>
    <button type="button" className="secondary dictation-button" onClick={toggle} aria-pressed={listening} aria-label={t(listening ? 'dictation.stop' : 'dictation.start')} title={t(listening ? 'dictation.stop' : 'dictation.start')}>
      {listening ? '⏹' : '🎤'}
    </button>
    {error && <span className="dictation-hint" role="status">{t(error)}</span>}
  </>
}
