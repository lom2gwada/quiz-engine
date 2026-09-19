import { describe, expect, it } from 'vitest'
import { formatDuration } from './time'

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
