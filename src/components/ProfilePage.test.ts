import { describe, expect, it } from 'vitest'
import { resolveAvatarInput } from './ProfilePage'

describe('resolveAvatarInput', () => {
  it('returns an empty string for blank input', () => {
    expect(resolveAvatarInput('')).toBe('')
    expect(resolveAvatarInput('   ')).toBe('')
  })

  it('keeps a pasted emoji', () => {
    expect(resolveAvatarInput('🦜')).toBe('🦜')
    expect(resolveAvatarInput('  🌋  ')).toBe('🌋')
  })

  it('keeps only the first grapheme of a longer paste', () => {
    expect(resolveAvatarInput('🦈🐬')).toBe('🦈')
    expect(resolveAvatarInput('abc')).toBe('a')
  })

  it('converts a hex code point in several notations', () => {
    expect(resolveAvatarInput('U+1F984')).toBe('🦄')
    expect(resolveAvatarInput('1F984')).toBe('🦄')
    expect(resolveAvatarInput('1f984')).toBe('🦄')
    expect(resolveAvatarInput('u1f984')).toBe('🦄')
  })

  it('converts a ZWJ sequence given as several code points', () => {
    expect(resolveAvatarInput('1F3F4 200D 2620 FE0F')).toBe('🏴‍☠️')
    expect(resolveAvatarInput('1F3F4+200D+2620+FE0F')).toBe('🏴‍☠️')
  })

  it('rejects an unusable code point (control char, surrogate)', () => {
    expect(resolveAvatarInput('0007')).toBe('') // BEL, < 0x20
    expect(resolveAvatarInput('D800')).toBe('') // lone surrogate
  })

  it('treats a short or digit-less hex-looking string as a pasted character', () => {
    expect(resolveAvatarInput('café')).toBe('c')
    expect(resolveAvatarInput('abc')).toBe('a') // 3 chars, no U+ prefix
    expect(resolveAvatarInput('cafe')).toBe('c') // 4 hex chars but no digit
  })

  it('honours the U+ prefix even for short codes', () => {
    expect(resolveAvatarInput('U+41')).toBe('A')
  })
})
