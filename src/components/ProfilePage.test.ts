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

  it('keeps only the first emoji of a longer paste', () => {
    expect(resolveAvatarInput('🦈🐬')).toBe('🦈')
    expect(resolveAvatarInput('🦈 bonjour')).toBe('🦈')
  })

  it('keeps a ZWJ sequence and a flag whole', () => {
    expect(resolveAvatarInput('🏴‍☠️')).toBe('🏴‍☠️')
    expect(resolveAvatarInput('🇬🇵')).toBe('🇬🇵')
  })

  it('rejects anything that is not an emoji, code points included', () => {
    expect(resolveAvatarInput('abc')).toBe('')
    expect(resolveAvatarInput('U+1F984')).toBe('')
    expect(resolveAvatarInput('1F984')).toBe('')
    expect(resolveAvatarInput('é')).toBe('')
  })
})
