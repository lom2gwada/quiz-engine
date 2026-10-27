import { describe, expect, it } from 'vitest'
import { formatDuration, formatLongDuration } from './time'

describe('formatDuration', () => {
  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('pads single-digit seconds', () => {
    expect(formatDuration(5)).toBe('0:05')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05')
  })

  it('does not pad minutes', () => {
    expect(formatDuration(3600)).toBe('60:00')
  })
})

describe('formatLongDuration', () => {
  it('secondes seules sous la minute', () => {
    expect(formatLongDuration(0)).toBe('0 s')
    expect(formatLongDuration(45)).toBe('45 s')
  })

  it('minutes et secondes sous l’heure (sans secondes si rondes)', () => {
    expect(formatLongDuration(725)).toBe('12 min 05 s')
    expect(formatLongDuration(600)).toBe('10 min')
  })

  it('heures et minutes dès une heure : 303:12 devient 5 h 03 min', () => {
    expect(formatLongDuration(303 * 60 + 12)).toBe('5 h 03 min')
    expect(formatLongDuration(3600)).toBe('1 h 00 min')
  })

  it('arrondit les fractions et ignore les valeurs négatives', () => {
    expect(formatLongDuration(59.6)).toBe('1 min')
    expect(formatLongDuration(-5)).toBe('0 s')
  })
})
