import { describe, expect, it } from 'vitest'
import { parseQuiz } from './quizValidation'

function quiz(questions: unknown[]) {
  return {
    version: '1.0',
    metadata: { title: 'Test', author: 'Test', createdAt: '2026-01-01' },
    categories: [{ id: 'general', label: 'Général' }],
    questions,
  }
}

const base = { id: 'q1', category: 'general', difficulty: 'easy', tags: [], explanation: 'Explication.', points: 1 }

describe('parseQuiz — root schema', () => {
  it('parses a minimal valid quiz', () => {
    const result = parseQuiz(quiz([{ ...base, type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true } }]))
    expect(result.questions).toHaveLength(1)
    expect(result.metadata.title).toBe('Test')
  })

  it('rejects a non-object root', () => {
    expect(() => parseQuiz('not an object')).toThrow()
  })

  it('rejects a missing version', () => {
    const { version: _version, ...rest } = quiz([])
    expect(() => parseQuiz(rest)).toThrow()
  })

  it('rejects malformed metadata', () => {
    expect(() => parseQuiz({ ...quiz([]), metadata: { title: 'Test' } })).toThrow()
  })

  it('rejects a question referencing an unknown category', () => {
    const bad = quiz([{ ...base, category: 'unknown', type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true } }])
    expect(() => parseQuiz(bad)).toThrow('catégorie existante')
  })

  it('still accepts the legacy "themes"/"theme" keys from older quiz JSON', () => {
    const legacy = {
      version: '1.0',
      metadata: { title: 'Test', author: 'Test', createdAt: '2026-01-01' },
      themes: [{ id: 'general', label: 'Général' }],
      questions: [{ id: 'q1', theme: 'general', difficulty: 'easy', tags: [], explanation: '', points: 1, type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true } }],
    }
    const result = parseQuiz(legacy)
    expect(result.categories).toEqual([{ id: 'general', label: 'Général' }])
    expect(result.questions[0].category).toBe('general')
  })

  it('passes an optional topic through and rejects a non-string one', () => {
    const ok = parseQuiz(quiz([{ ...base, type: 'boolean', question: 'V/F ?', content: { isTrue: true }, topic: 'Capitale de Cuba' }]))
    expect(ok.questions[0].topic).toBe('Capitale de Cuba')
    const bad = quiz([{ ...base, type: 'boolean', question: 'V/F ?', content: { isTrue: true }, topic: 42 }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('passes an inline shapeSvg through and rejects a non-SVG string', () => {
    const svg = '<svg viewBox="0 0 100 100"><path d="M0,0L10,0L5,10Z"/></svg>'
    const answers = [{ id: 'a', label: 'A', isCorrect: true }, { id: 'b', label: 'B', isCorrect: false }]
    const ok = parseQuiz(quiz([{ ...base, type: 'qcm', question: 'Quel territoire ?', content: { multiple: false, answers }, shapeSvg: svg }]))
    expect(ok.questions[0].shapeSvg).toBe(svg)
    const bad = quiz([{ ...base, type: 'qcm', question: 'Q ?', content: { multiple: false, answers }, shapeSvg: 'not svg' }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('parses an optional metadata description', () => {
    const withDescription = { ...quiz([]), metadata: { ...quiz([]).metadata, description: 'Un quiz de test.' } }
    const result = parseQuiz(withDescription)
    expect(result.metadata.description).toBe('Un quiz de test.')
  })

  it('rejects a non-string metadata description', () => {
    const bad = { ...quiz([]), metadata: { ...quiz([]).metadata, description: 42 } }
    expect(() => parseQuiz(bad)).toThrow()
  })
})

describe('parseQuiz — shared question fields', () => {
  it('rejects a negative points value', () => {
    const bad = quiz([{ ...base, points: -1, type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true } }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('rejects an invalid difficulty', () => {
    const bad = quiz([{ ...base, difficulty: 'impossible', type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true } }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('rejects a non-array tags field', () => {
    const bad = quiz([{ ...base, tags: 'not-an-array', type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true } }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('parses a question with an optional image', () => {
    const result = parseQuiz(quiz([{ ...base, type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true }, imageUrl: 'https://example.com/x.jpg', imageAlt: 'Un drapeau' }]))
    expect(result.questions[0]).toMatchObject({ imageUrl: 'https://example.com/x.jpg', imageAlt: 'Un drapeau' })
  })

  it('rejects an empty imageUrl', () => {
    const bad = quiz([{ ...base, type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true }, imageUrl: '' }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('rejects a non-string imageAlt', () => {
    const bad = quiz([{ ...base, type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true }, imageUrl: 'https://example.com/x.jpg', imageAlt: 42 }])
    expect(() => parseQuiz(bad)).toThrow()
  })
})

describe('parseQuiz — qcm', () => {
  const answers = [{ id: 'a', label: 'A', isCorrect: true }, { id: 'b', label: 'B', isCorrect: false }]

  it('parses a valid qcm question', () => {
    const result = parseQuiz(quiz([{ ...base, type: 'qcm', question: 'Q ?', content: { multiple: false, answers } }]))
    expect(result.questions[0]).toMatchObject({ type: 'qcm', content: { multiple: false, answers } })
  })

  it('rejects a missing multiple flag', () => {
    const bad = quiz([{ ...base, type: 'qcm', question: 'Q ?', content: { answers } }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('rejects an answer missing isCorrect', () => {
    const bad = quiz([{ ...base, type: 'qcm', question: 'Q ?', content: { multiple: false, answers: [{ id: 'a', label: 'A' }] } }])
    expect(() => parseQuiz(bad)).toThrow()
  })
})

describe('parseQuiz — code', () => {
  it('parses a valid code question', () => {
    const content = { language: 'js', snippet: 'const x = 1', answers: [{ id: 'a', label: 'A', isCorrect: true }] }
    const result = parseQuiz(quiz([{ ...base, type: 'code', question: 'Q ?', content }]))
    expect(result.questions[0]).toMatchObject({ type: 'code', content })
  })

  it('rejects a missing snippet', () => {
    const bad = quiz([{ ...base, type: 'code', question: 'Q ?', content: { language: 'js', answers: [] } }])
    expect(() => parseQuiz(bad)).toThrow()
  })
})

describe('parseQuiz — text', () => {
  it('parses a valid text question', () => {
    const content = { expectedAnswers: ['Paris'], caseSensitive: false }
    const result = parseQuiz(quiz([{ ...base, type: 'text', question: 'Q ?', content }]))
    expect(result.questions[0]).toMatchObject({ type: 'text', content })
  })

  it('rejects a missing caseSensitive flag', () => {
    const bad = quiz([{ ...base, type: 'text', question: 'Q ?', content: { expectedAnswers: ['Paris'] } }])
    expect(() => parseQuiz(bad)).toThrow()
  })
})

describe('parseQuiz — ordering', () => {
  const items = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]

  it('parses a valid ordering question', () => {
    const result = parseQuiz(quiz([{ ...base, type: 'ordering', question: 'Q ?', content: { items, correctOrder: ['b', 'a'] } }]))
    expect(result.questions[0]).toMatchObject({ type: 'ordering', content: { correctOrder: ['b', 'a'] } })
  })

  it('rejects a correctOrder with the wrong length', () => {
    const bad = quiz([{ ...base, type: 'ordering', question: 'Q ?', content: { items, correctOrder: ['a'] } }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('rejects a correctOrder referencing an unknown item id', () => {
    const bad = quiz([{ ...base, type: 'ordering', question: 'Q ?', content: { items, correctOrder: ['a', 'z'] } }])
    expect(() => parseQuiz(bad)).toThrow()
  })
})

describe('parseQuiz — boolean', () => {
  it('parses a valid boolean question', () => {
    const result = parseQuiz(quiz([{ ...base, type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: false } }]))
    expect(result.questions[0]).toMatchObject({ type: 'boolean', content: { isTrue: false } })
  })

  it('rejects a non-boolean isTrue', () => {
    const bad = quiz([{ ...base, type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: 'yes' } }])
    expect(() => parseQuiz(bad)).toThrow()
  })
})

describe('parseQuiz — cloze', () => {
  it('parses a valid cloze question', () => {
    const content = { expectedAnswers: ['Paris'], caseSensitive: false }
    const result = parseQuiz(quiz([{ ...base, type: 'cloze', question: 'La capitale est ___.', content }]))
    expect(result.questions[0]).toMatchObject({ type: 'cloze', content })
  })

  it('rejects a question without a blank marker', () => {
    const content = { expectedAnswers: ['Paris'], caseSensitive: false }
    const bad = quiz([{ ...base, type: 'cloze', question: 'Pas de trou ici.', content }])
    expect(() => parseQuiz(bad)).toThrow('marqueur')
  })
})

describe('parseQuiz — matching', () => {
  const left = [{ id: 'fr', label: 'France' }, { id: 'jp', label: 'Japon' }]
  const right = [{ id: 'paris', label: 'Paris' }, { id: 'tokyo', label: 'Tokyo' }]
  const correctPairs = { fr: 'paris', jp: 'tokyo' }

  it('parses a valid matching question', () => {
    const result = parseQuiz(quiz([{ ...base, type: 'matching', question: 'Associez.', content: { left, right, correctPairs } }]))
    expect(result.questions[0]).toMatchObject({ type: 'matching', content: { correctPairs } })
  })

  it('rejects a correctPairs missing a left id', () => {
    const bad = quiz([{ ...base, type: 'matching', question: 'Associez.', content: { left, right, correctPairs: { fr: 'paris' } } }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('rejects a correctPairs value referencing an unknown right id', () => {
    const bad = quiz([{ ...base, type: 'matching', question: 'Associez.', content: { left, right, correctPairs: { fr: 'paris', jp: 'unknown' } } }])
    expect(() => parseQuiz(bad)).toThrow()
  })
})

describe('parseQuiz — numeric', () => {
  it('parses a valid numeric question', () => {
    const content = { min: 0, max: 100, step: 1, target: 42, tolerance: 5, unit: 'km' }
    const result = parseQuiz(quiz([{ ...base, type: 'numeric', question: 'Combien ?', content }]))
    expect(result.questions[0]).toMatchObject({ type: 'numeric', content })
  })

  it('parses a valid numeric question without a unit', () => {
    const content = { min: 0, max: 100, step: 1, target: 42, tolerance: 5 }
    const result = parseQuiz(quiz([{ ...base, type: 'numeric', question: 'Combien ?', content }]))
    expect((result.questions[0] as { content: { unit?: string } }).content.unit).toBeUndefined()
  })

  it('rejects min >= max', () => {
    const bad = quiz([{ ...base, type: 'numeric', question: 'Combien ?', content: { min: 100, max: 100, step: 1, target: 100, tolerance: 0 } }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('rejects a target outside the min/max range', () => {
    const bad = quiz([{ ...base, type: 'numeric', question: 'Combien ?', content: { min: 0, max: 10, step: 1, target: 20, tolerance: 1 } }])
    expect(() => parseQuiz(bad)).toThrow()
  })

  it('rejects a negative tolerance', () => {
    const bad = quiz([{ ...base, type: 'numeric', question: 'Combien ?', content: { min: 0, max: 10, step: 1, target: 5, tolerance: -1 } }])
    expect(() => parseQuiz(bad)).toThrow()
  })
})

describe('parseQuiz — unknown type', () => {
  it('rejects a question with an unrecognized type', () => {
    const bad = quiz([{ ...base, type: 'unknown', question: 'Q ?', content: {} }])
    expect(() => parseQuiz(bad)).toThrow()
  })
})
