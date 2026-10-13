// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { speakSentences, stopSpeaking } from './speech'

class FakeUtterance {
  lang = ''
  voice: unknown = null
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  constructor(public text: string) {}
}

function installSynth(voices: { lang: string; localService: boolean }[] = []) {
  const synth = {
    speaking: false,
    pending: false,
    spoken: [] as FakeUtterance[],
    cancel: vi.fn(() => { synth.speaking = false; synth.pending = false }),
    resume: vi.fn(),
    getVoices: () => voices,
    speak: vi.fn((utterance: FakeUtterance) => { synth.spoken.push(utterance) }),
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
  ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = FakeUtterance
  ;(globalThis as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = FakeUtterance
  return synth
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); stopSpeaking() })

describe('speakSentences (fiabilité sur mobile)', () => {
  it('ne fait pas cancel() quand rien ne joue, mais reprend un moteur en pause (resume)', () => {
    const synth = installSynth()
    speakSentences(['Bonjour.', 'Au revoir.'], 'fr', vi.fn())
    expect(synth.cancel).not.toHaveBeenCalled()
    expect(synth.resume).toHaveBeenCalled()
    expect(synth.spoken.map((u) => u.text)).toEqual(['Bonjour.', 'Au revoir.'])
  })

  it('annule puis relance après un court délai quand une lecture est déjà en cours', () => {
    const synth = installSynth()
    synth.speaking = true
    speakSentences(['Bonjour.'], 'fr', vi.fn())
    expect(synth.cancel).toHaveBeenCalledTimes(1)
    expect(synth.speak).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(synth.speak).toHaveBeenCalledTimes(1)
  })

  it('n’impose qu’une voix locale ; sinon le navigateur choisit d’après la langue', () => {
    const network = installSynth([{ lang: 'fr-FR', localService: false }])
    speakSentences(['Bonjour.'], 'fr', vi.fn())
    expect(network.spoken[0].voice).toBeNull()
    expect(network.spoken[0].lang).toBe('fr-FR')

    const local = installSynth([{ lang: 'fr_FR', localService: true }])
    speakSentences(['Bonjour.'], 'fr', vi.fn())
    expect(local.spoken[0].voice).toEqual({ lang: 'fr_FR', localService: true })
  })

  it('signale une vraie erreur mais pas notre propre arrêt (canceled/interrupted)', () => {
    const synth = installSynth()
    const onError = vi.fn()
    const onEnd = vi.fn()
    speakSentences(['Bonjour.'], 'fr', onEnd, onError)
    synth.spoken[0].onerror?.({ error: 'canceled' })
    expect(onError).not.toHaveBeenCalled()
    speakSentences(['Bonjour.'], 'fr', onEnd, onError)
    synth.spoken[1].onerror?.({ error: 'not-allowed' })
    expect(onError).toHaveBeenCalledWith('not-allowed')
    expect(onEnd).toHaveBeenCalled()
  })

  it('déclare l’échec si rien ne démarre (file bloquée, son coupé…), et le dit à l’appelant', () => {
    installSynth()
    const onError = vi.fn()
    const onEnd = vi.fn()
    speakSentences(['Bonjour.'], 'fr', onEnd, onError)
    vi.advanceTimersByTime(3100)
    expect(onError).toHaveBeenCalledWith('not-started')
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('ne déclare pas d’échec si la lecture a bien démarré', () => {
    const synth = installSynth()
    const onError = vi.fn()
    speakSentences(['Bonjour.'], 'fr', vi.fn(), onError)
    synth.spoken[0].onstart?.()
    vi.advanceTimersByTime(3100)
    expect(onError).not.toHaveBeenCalled()
  })

  it('ne déclare pas d’échec si le moteur est en train de parler sans événement de démarrage', () => {
    const synth = installSynth()
    const onError = vi.fn()
    speakSentences(['Bonjour.'], 'fr', vi.fn(), onError)
    synth.speaking = true
    vi.advanceTimersByTime(3100)
    expect(onError).not.toHaveBeenCalled()
  })
})
