import { describe, expect, it } from 'vitest'
import { canReload, isChunkLoadError } from './staleChunk'

describe('isChunkLoadError', () => {
  it('reconnaît l\'échec d\'import dynamique de chaque navigateur', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x.github.io/app/assets/FicheModal-ab12.js'))).toBe(true)
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('Unable to preload CSS for /app/assets/Fiche-cd34.css'))).toBe(true)
  })

  it('laisse passer les autres erreurs', () => {
    expect(isChunkLoadError(new TypeError('Cannot read properties of undefined'))).toBe(false)
    expect(isChunkLoadError('boom')).toBe(false)
  })
})

describe('canReload', () => {
  it('autorise le premier rechargement, puis attend une minute', () => {
    expect(canReload(null, 1_000_000)).toBe(true)
    expect(canReload(1_000_000, 1_030_000)).toBe(false)
    expect(canReload(1_000_000, 1_061_000)).toBe(true)
  })
})
