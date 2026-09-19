import { describe, expect, it } from 'vitest'
import type { DataI18n } from '../i18n/data'
import { buildSpeech, speechLocale } from './speechText'
import { inferSchema, parseCsv } from './quizGenerator'

const rows = parseCsv([
  'pays;article;capitale;population;superficie_km2;independance;langues;religions',
  'Martinique;la;Fort-de-France;349000;1128;;français|créole martiniquais;catholicisme (80 %)|protestantisme (5 %)|autre (15 %)',
  'Barbade;la;Bridgetown;282000;430;1966;anglais;protestantisme (66 %)|catholicisme (4 %)|sans religion ou autre (30 %)',
  'Cuba;;La Havane;11000000;109884;1902;espagnol;',
  'Bahamas;les;Nassau;410000;13878;1973;anglais;',
].join('\n'))
const schema = { ...inferSchema(rows), noun: 'territoire', title: 'Test' }

const i18n: DataI18n = {
  values: {
    'Fort-de-France': { en: 'Fort-de-France' },
    français: { en: 'French' },
    'créole martiniquais': { en: 'Martinican Creole' },
    catholicisme: { en: 'Catholicism' },
    protestantisme: { en: 'Protestantism' },
    espagnol: { en: 'Spanish' },
    anglais: { en: 'English' },
  },
  articles: { Bahamas: { en: 'the' } },
  columnLabels: {},
}

const templates = {
  fr: [
    '{Name}, un territoire des Caraïbes.',
    'Sa capitale est {capitale}.',
    'Sa population est d’environ {population} habitants[, répartis sur {superficie_km2} kilomètres carrés].',
    'Son indépendance date de {independance}.',
    'On y parle {langues}.',
    'Religions principales : {religions:2}.',
    'Colonne absente : {inconnue}.',
  ],
  en: ['{Name} is in the Caribbean.', 'People there speak {langues}.', 'Its population is {population}.'],
}

const row = (name: string) => rows.find((r) => r.pays === name)!

describe('buildSpeech', () => {
  it('fills subject, of-subject, numbers, lists and optional segments', () => {
    const sentences = buildSpeech(row('Martinique'), schema, i18n, 'fr', templates)
    expect(sentences[0]).toBe('La Martinique, un territoire des Caraïbes.')
    expect(sentences[1]).toBe('Sa capitale est Fort-de-France.')
    expect(sentences[2]).toMatch(/^Sa population est d’environ 349\s000 habitants, répartis sur 1\s128 kilomètres carrés\.$/)
    expect(sentences).toContain('On y parle français et créole martiniquais.')
  })

  it('skips a sentence whose column is empty, and unknown columns', () => {
    const sentences = buildSpeech(row('Martinique'), schema, i18n, 'fr', templates)
    expect(sentences.some((s) => s.includes('indépendance'))).toBe(false)
    expect(sentences.some((s) => s.includes('absente'))).toBe(false)
  })

  it('keeps years unformatted and limits multivalue columns, dropping annotations', () => {
    const cuba = buildSpeech(row('Cuba'), schema, i18n, 'fr', templates)
    expect(cuba).toContain('Son indépendance date de 1902.')
    const martinique = buildSpeech(row('Martinique'), schema, i18n, 'fr', { fr: ['Religions : {religions:2}.', 'Toutes : {religions}.'] })
    expect(martinique).toEqual(['Religions : catholicisme et autre.', 'Toutes : catholicisme, autre et protestantisme.'])
  })

  it('says the biggest values first when they carry a percentage, not the first ones in the file', () => {
    const barbade = buildSpeech(row('Barbade'), schema, i18n, 'fr', { fr: ['Principaux : {religions:2}.'] })
    expect(barbade).toEqual(['Principaux : protestantisme et sans religion ou autre.'])
  })

  it('keeps the file order for values without a percentage', () => {
    expect(buildSpeech(row('Martinique'), schema, i18n, 'fr', { fr: ['{langues}'] })).toEqual(['français et créole martiniquais'])
  })

  it('drops the optional segment when one of its columns is empty', () => {
    const noArea = parseCsv('pays;article;population;superficie_km2\nSainte-Lucie;;180000;\nAruba;;106000;180')
    const s = { ...inferSchema(noArea), noun: 'x', title: 'x' }
    const out = buildSpeech(noArea[0], s, undefined, 'fr', templates)
    expect(out.find((sentence) => sentence.startsWith('Sa population'))).toMatch(/^Sa population est d’environ 180.000 habitants\.$/)
  })

  it('speaks the interface language when templates exist, translating the data', () => {
    const sentences = buildSpeech(row('Bahamas'), schema, i18n, 'en', templates)
    expect(sentences[0]).toBe('The Bahamas is in the Caribbean.')
    expect(sentences[1]).toBe('People there speak English.')
    expect(sentences[2]).toBe('Its population is 410,000.')
  })

  it('falls back to French for both text and data when the locale has no templates', () => {
    expect(speechLocale(templates, 'es')).toBe('fr')
    const sentences = buildSpeech(row('Martinique'), schema, i18n, 'es', templates)
    expect(sentences[0]).toBe('La Martinique, un territoire des Caraïbes.')
    expect(sentences).toContain('On y parle français et créole martiniquais.')
  })

  it('joins lists with the conjunction of the spoken language (grammar), not platform ICU data', () => {
    const list = { fr: ['{langues}'], en: ['{langues}'], ht: ['{langues}'] }
    expect(buildSpeech(row('Martinique'), schema, i18n, 'fr', list)).toEqual(['français et créole martiniquais'])
    expect(buildSpeech(row('Martinique'), schema, i18n, 'en', list)).toEqual(['French and Martinican Creole'])
    expect(buildSpeech(row('Martinique'), schema, i18n, 'ht', list)).toEqual(['français ak créole martiniquais'])
  })

  it('says negative numbers with a word and elides the article before a vowel', () => {
    const cold = parseCsv('element;article;point_fusion_c\nHydrogène;l\';-259.34\nSodium;le;97.8')
    const s = { ...inferSchema(cold), noun: 'élément', title: 'x' }
    const names: DataI18n = { values: {}, articles: {}, columnLabels: {}, commonNouns: true }
    expect(buildSpeech(cold[0], s, names, 'fr', { fr: ['{Name} fond à {point_fusion_c} degrés.'] })).toEqual(["L'hydrogène fond à moins 259,34 degrés."])
    expect(buildSpeech(cold[1], s, names, 'fr', { fr: ['{Name} fond à {point_fusion_c} degrés.'] })).toEqual(['Le sodium fond à 97,8 degrés.'])
    expect(buildSpeech(cold[0], s, names, 'en', { en: ['Melts at {point_fusion_c}.'] })).toEqual(['Melts at minus 259.34.'])
  })

  it('returns nothing without templates', () => {
    expect(buildSpeech(row('Cuba'), schema, i18n, 'fr', undefined)).toEqual([])
  })
})
