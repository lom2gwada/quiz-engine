let ctx: AudioContext | null = null
let muted = typeof localStorage !== 'undefined' && localStorage.getItem('oliverquiz-muted') === 'true'

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(frequency: number, duration: number, delay = 0, type: OscillatorType = 'sine', peak = 0.07) {
  if (muted) return
  const audio = getContext()
  if (!audio) return
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  const start = audio.currentTime + delay
  gain.gain.setValueAtTime(peak, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(audio.destination)
  oscillator.start(start)
  oscillator.stop(start + duration)
}

export function isSoundMuted(): boolean {
  return muted
}

export function setSoundMuted(value: boolean): void {
  muted = value
  localStorage.setItem('oliverquiz-muted', String(value))
}

export function playClick(): void {
  tone(560, 0.05, 0, 'triangle', 0.05)
}

export function playFinish(): void {
  tone(523.25, 0.14, 0, 'sine', 0.06)
  tone(659.25, 0.18, 0.1, 'sine', 0.06)
}

export function playVictory(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => tone(frequency, 0.2, index * 0.1, 'sine', 0.07))
}
