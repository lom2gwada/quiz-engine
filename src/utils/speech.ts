import type { Locale } from '../i18n/locale'

/** Étiquette de langue BCP 47 par locale. Le créole haïtien n'a en général pas de voix : la fiche est lue en français
 *  (cf. `speechLocale`), donc `ht` n'arrive pas ici ; l'entrée sert de filet. */
const LANG_TAG: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', nl: 'nl-NL', ht: 'fr-FR' }

export const speechSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

// Chrome peut ramasser les utterances en cours de lecture (leur `onend` ne part alors jamais) : on les garde en vie.
let active: SpeechSynthesisUtterance[] = []
// Chaque lecture a un numéro ; un `onend`/`onerror` d'une lecture annulée ne doit pas toucher la suivante.
let session = 0

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const primary = lang.split('-')[0]
  return voices.find((voice) => voice.lang === lang) ?? voices.find((voice) => voice.lang.split(/[-_]/)[0] === primary)
}

/** Lit les phrases l'une après l'autre (un texte long d'un seul bloc est coupé par certains navigateurs).
 *  `onEnd` : fin normale, erreur ou arrêt — jamais après un nouvel appel à `speakSentences`. */
export function speakSentences(sentences: string[], locale: Locale, onEnd: () => void): void {
  if (!speechSupported() || !sentences.length) { onEnd(); return }
  stopSpeaking()
  const mine = session
  const lang = LANG_TAG[locale] ?? 'fr-FR'
  const voice = pickVoice(lang)
  const finish = () => { if (session === mine) { active = []; onEnd() } }
  active = sentences.map((sentence, index) => {
    const utterance = new SpeechSynthesisUtterance(sentence)
    utterance.lang = lang
    if (voice) utterance.voice = voice
    if (index === sentences.length - 1) utterance.onend = finish
    utterance.onerror = finish
    return utterance
  })
  active.forEach((utterance) => window.speechSynthesis.speak(utterance))
}

export function stopSpeaking(): void {
  session += 1
  active = []
  if (speechSupported()) window.speechSynthesis.cancel()
}
