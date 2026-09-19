// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { guestPassUrl, hasGuestPassInSession, markGuestPassInSession } from './guestPass'

describe('guestPassUrl', () => {
  it('adds the token as a `guest` query param, dropping any existing query/hash', () => {
    window.history.replaceState(null, '', '/some-app/?foo=bar#section')
    const url = guestPassUrl('abc-123')
    expect(url).toBe('http://localhost:3000/some-app/?guest=abc-123')
  })
})

describe('guest pass session flag', () => {
  beforeEach(() => sessionStorage.clear())

  it('is absent until marked', () => {
    expect(hasGuestPassInSession()).toBe(false)
  })

  it('persists for the tab once marked', () => {
    markGuestPassInSession()
    expect(hasGuestPassInSession()).toBe(true)
  })
})
