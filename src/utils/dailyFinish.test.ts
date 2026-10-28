import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: string[] = []
let rpcResult: { data: unknown; error: { code: string } | null } = { data: true, error: null }
let updateResult: { data: unknown[] | null; error: unknown } = { data: [{ day: 'x' }], error: null }

vi.mock('./supabase', () => ({
  supabase: {
    rpc: (name: string) => { calls.push(`rpc:${name}`); return Promise.resolve(rpcResult) },
    from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ is: () => ({ select: () => { calls.push('update'); return Promise.resolve(updateResult) } }) }) }) }) }),
  },
}))

import { finishDaily } from './dailyChallenge'

const stats = { played: 20, correct: 17, bestStreak: 9, points: 0 }

describe('finishDaily', () => {
  beforeEach(() => { calls.length = 0; rpcResult = { data: true, error: null }; updateResult = { data: [{ day: 'x' }], error: null } })

  it('passe par la fonction de la base', async () => {
    expect(await finishDaily('u', '2026-10-28', stats, 90)).toBe(true)
    expect(calls).toEqual(['rpc:finish_test_daily'])
  })

  it('un score refusé par la base reste refusé (pas de repli)', async () => {
    rpcResult = { data: false, error: null }
    expect(await finishDaily('u', '2026-10-28', stats, 90)).toBe(false)
    expect(calls).toEqual(['rpc:finish_test_daily'])
  })

  it('fonction absente (migration pas appliquée) : repli sur la mise à jour directe', async () => {
    rpcResult = { data: null, error: { code: 'PGRST202' } }
    expect(await finishDaily('u', '2026-10-28', stats, 90)).toBe(true)
    expect(calls).toEqual(['rpc:finish_test_daily', 'update'])
  })

  it('une autre erreur n’est pas contournée', async () => {
    rpcResult = { data: null, error: { code: '42501' } }
    expect(await finishDaily('u', '2026-10-28', stats, 90)).toBe(false)
    expect(calls).toEqual(['rpc:finish_test_daily'])
  })
})
