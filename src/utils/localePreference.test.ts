// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { readLocalePreference, writeLocalePreference } from './localePreference'

describe('localePreference', () => {
  beforeEach(() => localStorage.clear())

  it('rien par défaut', () => {
    expect(readLocalePreference()).toBeNull()
  })

  it('garde la langue choisie', () => {
    writeLocalePreference('nl')
    expect(readLocalePreference()).toBe('nl')
  })

  it('ignore une valeur qui n’est pas une langue prise en charge', () => {
    localStorage.setItem('test-app:locale', 'xx')
    expect(readLocalePreference()).toBeNull()
  })
})
