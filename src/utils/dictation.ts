import type { Locale } from '../i18n/locale'

// Le créole haïtien n'a pas de reconnaissance vocale : pas de dictée (la lire en français transcrirait
// n'importe quoi), le bouton est simplement masqué.
const LANG_TAG: Partial<Record<Locale, string>> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', nl: 'nl-NL' }

interface RecognitionResultEvent { results: ArrayLike<ArrayLike<{ transcript: string }>> }
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type RecognitionConstructor = new () => Recognition

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const scope = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}

export const dictationSupported = (locale: Locale): boolean => Boolean(LANG_TAG[locale] && recognitionConstructor())

/** Le moteur de dictée ajoute volontiers une ponctuation finale (« Paris. ») qu'on ne veut pas dans le champ. */
export function cleanTranscript(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/[\s.,;:!?…]+$/, '')
}

/** Une seule phrase dictée : `onText` reçoit le texte nettoyé, `onEnd` part toujours à la fin (réussie, vide, refusée
 *  ou interrompue), `onError` avec le code d'erreur du navigateur (`not-allowed`, `no-speech`…). Renvoie la fonction
 *  d'arrêt, ou `null` si la dictée n'est pas disponible. */
export function startDictation(locale: Locale, handlers: { onText: (text: string) => void; onEnd: () => void; onError: (code: string) => void }): (() => void) | null {
  const Ctor = recognitionConstructor()
  const lang = LANG_TAG[locale]
  if (!Ctor || !lang) return null
  const recognition = new Ctor()
  recognition.lang = lang
  recognition.continuous = false
  recognition.interimResults = false
  recognition.onresult = (event) => {
    const text = cleanTranscript(Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(' '))
    if (text) handlers.onText(text)
  }
  recognition.onerror = (event) => handlers.onError(event.error)
  recognition.onend = handlers.onEnd
  try {
    recognition.start()
  } catch {
    handlers.onError('failed')
    handlers.onEnd()
    return null
  }
  return () => recognition.stop()
}
