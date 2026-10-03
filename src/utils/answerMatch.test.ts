import { describe, expect, it } from 'vitest'
import { matchesExpected, normalizeAnswer, withinOneEdit } from './answerMatch'

describe('normalizeAnswer', () => {
  it('ignores case, accents, hyphens/apostrophes/spaces and the leading article', () => {
    expect(normalizeAnswer('  Port-d’Espagne ', false)).toBe('port d espagne')
    expect(normalizeAnswer('Bogotá', false)).toBe('bogota')
    expect(normalizeAnswer('le peso', false)).toBe('peso')
  })

  it('only trims in case-sensitive mode', () => {
    expect(normalizeAnswer(' Le Peso ', true)).toBe('Le Peso')
  })
})

describe('withinOneEdit', () => {
  it('accepts one substitution, insertion, deletion or adjacent swap', () => {
    expect(withinOneEdit('bogota', 'bogata')).toBe(true)
    expect(withinOneEdit('bogota', 'bogotta')).toBe(true)
    expect(withinOneEdit('bogota', 'bogot')).toBe(true)
    expect(withinOneEdit('bridgetown', 'bridgetwon')).toBe(true)
  })

  it('rejects two edits or a length gap above one', () => {
    expect(withinOneEdit('bogota', 'bogaat')).toBe(false)
    expect(withinOneEdit('bogota', 'bog')).toBe(false)
    expect(withinOneEdit('abcdef', 'badcef')).toBe(false)
  })

  it('works at the edges of the string', () => {
    expect(withinOneEdit('abcde', 'xbcde')).toBe(true)
    expect(withinOneEdit('abcde', 'abcdx')).toBe(true)
    expect(withinOneEdit('abcde', 'abcdef')).toBe(true)
    expect(withinOneEdit('abcde', 'bcde')).toBe(true)
  })
})

describe('matchesExpected', () => {
  it('accepts an exact answer after normalization', () => {
    expect(matchesExpected('PORT D’ESPAGNE', ['Port-d’Espagne'], false)).toBe(true)
  })

  it('tolerates one typo on a long enough, digit-free answer', () => {
    expect(matchesExpected('Bridgetwon', ['Bridgetown'], false)).toBe(true)
    expect(matchesExpected('Kingstwn', ['Kingstown'], false)).toBe(true)
  })

  it('does not tolerate two typos', () => {
    expect(matchesExpected('Bridgtwon', ['Bridgetown'], false)).toBe(false)
  })

  it('stays strict on short answers (different words, not typos)', () => {
    expect(matchesExpected('Cube', ['Cuba'], false)).toBe(false)
    expect(matchesExpected('Mala', ['Mali'], false)).toBe(false)
  })

  it('stays strict when the expected answer contains digits', () => {
    expect(matchesExpected('[Xe]6s1 4f14', ['[Xe]6s2 4f14'], false)).toBe(false)
    expect(matchesExpected('1980', ['1981'], false)).toBe(false)
  })

  it('stays strict in case-sensitive mode', () => {
    expect(matchesExpected('Bridgetwon', ['Bridgetown'], true)).toBe(false)
    expect(matchesExpected('Bridgetown', ['Bridgetown'], true)).toBe(true)
  })

  it('matches any of the expected answers', () => {
    expect(matchesExpected('dollar americain', ['dollar américain', 'USD'], false)).toBe(true)
  })

  it('rejects an unrelated answer', () => {
    expect(matchesExpected('Kingston', ['Bridgetown'], false)).toBe(false)
  })
})
