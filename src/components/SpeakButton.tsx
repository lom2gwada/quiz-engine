import { useEffect, useState } from 'react'
import type { Locale } from '../i18n/locale'
import { useT } from '../i18n'
import { speakSentences, speechSupported, stopSpeaking } from '../utils/speech'

/** Bouton « Écouter » / « Arrêter » : lit la fiche à voix haute (synthèse vocale du navigateur). Caché si le
 *  navigateur n'en a pas ou s'il n'y a rien à dire. La lecture s'arrête quand les phrases changent ou au démontage. */
export function SpeakButton({ sentences, locale }: { sentences: string[]; locale: Locale }) {
  const t = useT()
  const [speaking, setSpeaking] = useState(false)
  const [failed, setFailed] = useState(false)
  const key = sentences.join('\n')

  useEffect(() => () => { stopSpeaking(); setSpeaking(false); setFailed(false) }, [key, locale])

  if (!speechSupported() || !sentences.length) return null

  const toggle = () => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return }
    setFailed(false)
    setSpeaking(true)
    speakSentences(sentences, locale, () => setSpeaking(false), () => setFailed(true))
  }

  return <>
    <button type="button" className="secondary fiche-speak" onClick={toggle} aria-pressed={speaking}>
      {speaking ? `⏹ ${t('fiche.speakStop')}` : `🔊 ${t('fiche.speak')}`}
    </button>
    {failed && <span className="dictation-hint" role="status">{t('fiche.speakError')}</span>}
  </>
}
