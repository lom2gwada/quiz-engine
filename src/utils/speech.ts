import type { Locale } from '../i18n/locale'

/** Étiquette de langue BCP 47 par locale. Le créole haïtien n'a en général pas de voix : la fiche est lue en français
 *  (cf. `speechLocale`), donc `ht` n'arrive pas ici ; l'entrée sert de filet. */
const LANG_TAG: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', nl: 'nl-NL', ht: 'fr-FR' }

/** Délai laissé à `cancel()` avant de relancer une lecture (Safari iOS et Chrome Android ignorent un `speak()` envoyé dans la foulée). */
const RESTART_DELAY_MS = 80
/** Au-delà, une lecture qui n'a jamais démarré est considérée comme échouée (file bloquée, voix absente, son coupé…). */
const START_TIMEOUT_MS = 2500

/** Forme minimale d'un code de langue BCP 47 (« de », « pt-br »…) : une app dont le contenu n'est pas dans une des
 *  locales de l'UI (un quiz en allemand) peut passer ce code tel quel plutôt qu'une locale. */
const LANGUAGE_CODE = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i

/** Étiquette de langue de la synthèse : celle de la locale connue, sinon le code BCP 47 tel quel, sinon le français. */
const langTag = (locale: Locale): string => LANG_TAG[locale] ?? (LANGUAGE_CODE.test(locale) ? locale : 'fr-FR')

export const speechSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

// Chrome peut ramasser les utterances en cours de lecture (leur `onend` ne part alors jamais) : on les garde en vie.
let active: SpeechSynthesisUtterance[] = []
// Chaque lecture a un numéro ; un `onend`/`onerror` d'une lecture annulée ne doit pas toucher la suivante.
let session = 0

/** Voix imposée seulement si elle est locale : sur mobile, une voix « réseau » hors ligne (ou économiseur de données)
 *  échoue en silence ; sans voix imposée, le navigateur choisit lui-même d'après `utterance.lang`. */
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.localService)
  const primary = lang.split('-')[0]
  return voices.find((voice) => voice.lang.replace('_', '-') === lang) ?? voices.find((voice) => voice.lang.split(/[-_]/)[0] === primary)
}

/** Diagnostic affiché avec l'erreur : langue demandée et nombre de voix du système pour cette langue (sur le total). */
export function speechDiagnostics(locale: Locale): string {
  if (!speechSupported()) return ''
  const lang = langTag(locale)
  const voices = window.speechSynthesis.getVoices()
  const matching = voices.filter((voice) => voice.lang.split(/[-_]/)[0] === lang.split('-')[0])
  return `${lang} · ${matching.length}/${voices.length} voix`
}

/** Lit les phrases l'une après l'autre (un texte long d'un seul bloc est coupé par certains navigateurs).
 *  `onEnd` : fin normale, erreur ou arrêt — jamais après un nouvel appel à `speakSentences`.
 *  `onError` : code d'erreur du navigateur (`not-allowed`, `language-unavailable`…) ou `not-started` si rien n'a démarré.
 *
 *  Deux essais si rien ne démarre : le premier SANS `cancel()` à vide (qui rend la lecture muette sur Safari iOS et
 *  Chrome Android), le second APRÈS un `cancel()` (certains Android gardent une file bloquée qu'il faut vider). */
export function speakSentences(sentences: string[], locale: Locale, onEnd: () => void, onError?: (code: string) => void): void {
  if (!speechSupported() || !sentences.length) { onEnd(); return }
  const synth = window.speechSynthesis
  const lang = langTag(locale)

  const attempt = (retry: boolean): void => {
    const busy = synth.speaking || synth.pending
    session += 1
    active = []
    const mine = session
    if (busy || retry) synth.cancel()
    const voice = pickVoice(lang)
    let started = false
    const finish = () => { if (session === mine) { active = []; onEnd() } }
    active = sentences.map((sentence, index) => {
      const utterance = new SpeechSynthesisUtterance(sentence)
      utterance.lang = lang
      if (voice) utterance.voice = voice
      if (index === 0) utterance.onstart = () => { started = true }
      if (index === sentences.length - 1) utterance.onend = finish
      utterance.onerror = (event) => {
        // `canceled` / `interrupted` : notre propre arrêt, pas une panne.
        if (session === mine && event.error !== 'canceled' && event.error !== 'interrupted') onError?.(event.error)
        finish()
      }
      return utterance
    })
    const start = () => {
      if (session !== mine) return
      synth.resume() // un moteur resté en pause (mobile, après mise en veille) ne lirait rien
      active.forEach((utterance) => synth.speak(utterance))
      setTimeout(() => {
        if (session !== mine || started || synth.speaking) return
        if (!retry) { attempt(true); return }
        stopSpeaking()
        onError?.('not-started')
        onEnd()
      }, START_TIMEOUT_MS)
    }
    if (busy || retry) setTimeout(start, RESTART_DELAY_MS)
    else start()
  }
  attempt(false)
}

export function stopSpeaking(): void {
  session += 1
  active = []
  if (speechSupported()) window.speechSynthesis.cancel()
}
