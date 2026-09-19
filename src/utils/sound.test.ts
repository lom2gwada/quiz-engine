// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('sound mute state', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('defaults to unmuted when nothing is stored', async () => {
    const { isSoundMuted } = await import('./sound')
    expect(isSoundMuted()).toBe(false)
  })

  it('reads the muted state from localStorage on load', async () => {
    localStorage.setItem('oliverquiz-muted', 'true')
    const { isSoundMuted } = await import('./sound')
    expect(isSoundMuted()).toBe(true)
  })

  it('persists the muted state and reflects it immediately', async () => {
    const { isSoundMuted, setSoundMuted } = await import('./sound')
    setSoundMuted(true)
    expect(isSoundMuted()).toBe(true)
    expect(localStorage.getItem('oliverquiz-muted')).toBe('true')
  })

  it('can be unmuted again', async () => {
    const { isSoundMuted, setSoundMuted } = await import('./sound')
    setSoundMuted(true)
    setSoundMuted(false)
    expect(isSoundMuted()).toBe(false)
    expect(localStorage.getItem('oliverquiz-muted')).toBe('false')
  })
})
