// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanTranscript, dictationSupported, startDictation } from './dictation'

class FakeRecognition {
  static last: FakeRecognition
  lang = ''
  continuous = true
  interimResults = true
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  started = false
  constructor() { FakeRecognition.last = this }
  start() { this.started = true }
  stop() { this.onend?.() }
}

afterEach(() => { delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition })

describe('cleanTranscript', () => {
  it('removes the trailing punctuation added by the recognizer', () => {
    expect(cleanTranscript('Paris.')).toBe('Paris')
    expect(cleanTranscript('Port-d’Espagne !')).toBe('Port-d’Espagne')
    expect(cleanTranscript('oui, …')).toBe('oui')
  })

  it('collapses spaces and keeps inner punctuation', () => {
    expect(cleanTranscript('  Saint   John’s ')).toBe('Saint John’s')
    expect(cleanTranscript('a, b')).toBe('a, b')
  })
})

describe('dictationSupported', () => {
  it('is false without a speech recognition engine', () => {
    expect(dictationSupported('fr')).toBe(false)
  })

  it('is true for locales with a recognition language, false for Haitian Creole', () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition
    expect(dictationSupported('fr')).toBe(true)
    expect(dictationSupported('nl')).toBe(true)
    expect(dictationSupported('ht')).toBe(false)
  })
})

describe('startDictation', () => {
  it('returns null when unavailable', () => {
    expect(startDictation('fr', { onText: vi.fn(), onEnd: vi.fn(), onError: vi.fn() })).toBeNull()
  })

  it('starts one-shot recognition in the locale language and delivers the cleaned text', () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition
    const handlers = { onText: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }
    const stop = startDictation('es', handlers)
    const recognition = FakeRecognition.last
    expect(recognition.started).toBe(true)
    expect(recognition.lang).toBe('es-ES')
    expect(recognition.continuous).toBe(false)
    expect(recognition.interimResults).toBe(false)
    recognition.onresult?.({ results: [[{ transcript: 'La Habana.' }]] })
    expect(handlers.onText).toHaveBeenCalledWith('La Habana')
    stop?.()
    expect(handlers.onEnd).toHaveBeenCalled()
  })

  it('ignores an empty transcript and forwards errors', () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition
    const handlers = { onText: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }
    startDictation('fr', handlers)
    FakeRecognition.last.onresult?.({ results: [[{ transcript: ' . ' }]] })
    FakeRecognition.last.onerror?.({ error: 'not-allowed' })
    expect(handlers.onText).not.toHaveBeenCalled()
    expect(handlers.onError).toHaveBeenCalledWith('not-allowed')
  })
})
