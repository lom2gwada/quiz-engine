import type { AnswerOption, MatchingItem, OrderingItem, Question, Quiz } from '../types/quiz'
import { DEFAULT_LOCALE, type Locale } from '../i18n/locale'
import type { DataI18n } from '../i18n/data'
import { makeDatasetI18n, splitAnnotation } from '../i18n/dataset'
import { getGrammar } from '../i18n/grammar'
import { fill, getTemplates } from '../i18n/templates'
import { formatNumber, formatNumericValue } from './number'

// Génère un quiz jouable à partir de lignes tabulaires (un CSV, plus tard une base de données)
// et d'un schéma décrivant les colonnes. Tout est pur et tourne dans le navigateur.

export type Row = Record<string, string>

export interface ColumnSpec {
  include: boolean
  kind: 'string' | 'number'
  unique: boolean
  isYear: boolean
  /** La colonne contient des URLs d'images (ex. drapeaux) → questions « quelle entité ? » sur l'image. */
  isImage?: boolean
  multivalueSeparator?: string
  label: string
  unit?: string
}

export interface GenSchema {
  subjectColumn: string
  articleColumn?: string
  noun: string
  title: string
  columns: Record<string, ColumnSpec>
}

// --- RNG déterministe (seed) ------------------------------------------------
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(value: string): number {
  let h = 2166136261
  for (const char of value) {
    h ^= char.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// --- CSV : détection du délimiteur + champs entre guillemets ---------------
export function parseCsv(text: string): Row[] {
  const clean = text.replace(/^﻿/, '')
  const headerLine = clean.slice(0, clean.search(/\r?\n|$/))
  const delimiter = [';', '\t', ',']
    .map((d) => ({ d, count: headerLine.split(d).length }))
    .sort((a, b) => b.count - a.count)[0].d

  const rows: string[][] = []
  let field = ''
  let record: string[] = []
  let inQuotes = false
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i]
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') { field += '"'; i += 1 }
        else inQuotes = false
      } else field += char
      continue
    }
    if (char === '"') { inQuotes = true; continue }
    if (char === delimiter) { record.push(field); field = ''; continue }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[i + 1] === '\n') i += 1
      record.push(field)
      if (record.length > 1 || record[0] !== '') rows.push(record)
      record = []
      field = ''
      continue
    }
    field += char
  }
  if (field !== '' || record.length) {
    record.push(field)
    if (record.length > 1 || record[0] !== '') rows.push(record)
  }
  if (!rows.length) return []

  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()])),
  )
}

// --- Inférence du schéma --------------------------------------------------
const hasValue = (v: string | undefined): boolean => v != null && String(v).trim() !== ''
const asNumber = (v: string): number => Number(String(v).replace(/[\s ]/g, '').replace(',', '.'))
// Un `+` en tête (indicatif téléphonique « +1 268 », « +590 ») n'est pas une quantité :
// on l'exclut du kind « number » pour éviter estimation / classement absurdes.
const isNumeric = (v: string): boolean => hasValue(v) && !/^\s*\+/.test(v) && Number.isFinite(asNumber(v))
const isUrl = (v: string): boolean => /^https?:\/\//i.test(v.trim())
const looksLikeImage = (v: string): boolean => /\.(svg|png|jpe?g|webp|gif|avif)(\?|$)/i.test(v) || /filepath/i.test(v)
const IMAGE_HEADER = /drapeau|flag|image|photo|logo|blason|armoiries|embl/i

const ARTICLE_VALUES = new Set(['', 'le', 'la', 'les', "l'"])
const SUBJECT_HINTS = ['nom', 'name', 'pays', 'sujet', 'titre', 'title', 'ville', 'city', 'entité', 'entite']
const UNIT_SUFFIXES: Array<[RegExp, string]> = [
  [/_hab_km2$/i, 'hab/km²'],
  [/_mds_usd$/i, 'Mds $'],
  [/_km2$/i, 'km²'],
  [/_deg$/i, '°'],
  [/_g_cm3$/i, 'g/cm³'],
  [/_c$/i, '°C'],
  [/_u$/i, 'u'],
  [/_m$/i, 'm'],
  [/_pct$/i, '%'],
  [/_pourcent$/i, '%'],
]

function labelOf(header: string): { label: string; unit?: string } {
  let unit: string | undefined
  let base = header
  for (const [re, u] of UNIT_SUFFIXES) {
    if (re.test(base)) { unit = u; base = base.replace(re, ''); break }
  }
  return { label: base.replace(/[_-]+/g, ' ').trim().toLowerCase(), unit }
}

export function inferSchema(rows: Row[], opts?: { subjectColumn?: string }): GenSchema {
  const headers = rows.length ? Object.keys(rows[0]) : []

  const articleColumn = headers.find(
    (h) => h.toLowerCase() === 'article' && rows.every((r) => ARTICLE_VALUES.has((r[h] ?? '').trim().toLowerCase())),
  )

  const isStringCol = (h: string): boolean => {
    const filled = rows.map((r) => r[h] ?? '').filter(hasValue)
    return filled.length > 0 && !filled.every(isNumeric) && !filled.every(isUrl)
  }
  const subjectColumn =
    (opts?.subjectColumn && headers.includes(opts.subjectColumn) ? opts.subjectColumn : undefined) ??
    headers.find((h) => SUBJECT_HINTS.includes(h.toLowerCase())) ??
    headers.find((h) => h !== articleColumn && isStringCol(h)) ??
    headers.find((h) => h !== articleColumn) ??
    headers[0] ??
    'sujet'

  const columns: Record<string, ColumnSpec> = {}
  for (const header of headers) {
    if (header === subjectColumn || header === articleColumn) continue
    const values = rows.map((r) => r[header] ?? '')
    const filled = values.filter(hasValue)
    const { label, unit } = labelOf(header)
    const allNumeric = filled.length > 0 && filled.every(isNumeric)
    // Entiers très répétés et peu nombreux (groupe 1-18, période 1-7…) : des catégories, pas des
    // quantités — sinon estimations et « faux » chiffrés absurdes (« période 2,5 »).
    const distinctValues = new Set(filled.map((v) => String(asNumber(v)))).size
    const isCode = allNumeric && filled.every((v) => Number.isInteger(asNumber(v))) && distinctValues <= 18 && distinctValues * 3 <= filled.length &&
      !filled.every((v) => asNumber(v) >= 1000 && asNumber(v) <= 2100)
    const kind: ColumnSpec['kind'] = allNumeric && !isCode ? 'number' : 'string'
    const isYear =
      kind === 'number' &&
      filled.every((v) => Number.isInteger(asNumber(v)) && asNumber(v) >= 1000 && asNumber(v) <= 2100)
    const multivalueSeparator = kind === 'string' && filled.some((v) => v.includes('|')) ? '|' : undefined
    const atoms = filled.flatMap((v) =>
      multivalueSeparator ? v.split(multivalueSeparator).map((s) => s.trim()).filter(Boolean) : [v],
    )
    const unique = kind === 'string' && !multivalueSeparator && new Set(atoms).size === atoms.length && atoms.length > 0
    const allUrls = filled.length > 0 && filled.every(isUrl)
    const isImage = allUrls && (filled.some(looksLikeImage) || IMAGE_HEADER.test(header))
    const include = filled.length > 0 && (!allUrls || isImage)
    columns[header] = { include, kind, unique, isYear, isImage, multivalueSeparator, label, unit }
  }

  return {
    subjectColumn,
    articleColumn,
    noun: subjectColumn.replace(/[_-]+/g, ' ').trim().toLowerCase() || 'élément',
    title: `Quiz — ${subjectColumn}`,
    columns,
  }
}

// --- Helpers de génération ----------------------------------------------
// `Math.abs` : `span` peut être négatif (ex. une longitude, target ≈ -77) — la magnitude du pas
// ne dépend que de l'ampleur de la variation, pas de son signe.
function niceStep(span: number): number {
  const raw = Math.abs(span) / 40
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
}
const roundTo = (v: number, step: number): number => Math.round(v / step) * step

// --- Génération --------------------------------------------------------
// Pas de quota : chaque colonne produit toutes les questions possibles.
// `choices`/`options` = nombre d'items affichés, `groupSize` = taille d'un
// classement / d'une association. Le tirage aléatoire se fait à la partie.
const CFG = {
  qcm: { choices: 3, points: 1, difficulty: 'easy' as const },
  qcmMulti: { options: 5, points: 2, difficulty: 'medium' as const },
  qcmBackward: { choices: 3, points: 2, difficulty: 'medium' as const },
  image: { choices: 3, points: 2, difficulty: 'medium' as const },
  boolean: { points: 1, difficulty: 'easy' as const },
  cloze: { points: 3, difficulty: 'hard' as const },
  estimate: { points: 2, difficulty: 'medium' as const },
  order: { groupSize: 4, points: 3, difficulty: 'hard' as const },
  matching: { groupSize: 4, points: 2, difficulty: 'medium' as const },
}

export function generateQuiz(
  rows: Row[],
  schema: GenSchema,
  opts: {
    seed: string
    locale?: Locale
    i18n?: DataI18n
    shapes?: Record<string, string>
    aliases?: Record<string, string[]>
    /** Auteur affiché sous le titre du quiz (défaut : « Quiz »). */
    author?: string
  },
): Quiz {
  const locale = opts.locale ?? DEFAULT_LOCALE
  const grammar = getGrammar(locale)
  const tpl = getTemplates(locale)
  const T = (key: keyof typeof tpl, params: Record<string, string | number> = {}): string => fill(tpl[key], params)
  // Traduction du jeu de données (valeurs, libellés, unités, article) — partagée avec les fiches.
  const data = makeDatasetI18n(opts.i18n, locale)
  const tr = data.value // valeur de cellule texte (repli FR ; jamais sur un nombre)
  const labelFor = data.label
  const unitFor = data.unit

  const rand = mulberry32(hashStr(opts.seed))
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const sample = <T>(arr: T[], n: number): T[] => shuffle(arr).slice(0, n)

  const { subjectColumn, articleColumn, noun } = schema
  // `nameOf` = valeur FR canonique : sert aux ids stables et aux clés de groupe (ne PAS traduire).
  // `displayName` = nom traduit, pour tout ce qui est affiché (réponses, libellés d'items…).
  const nameOf = (row: Row): string => row[subjectColumn] ?? ''
  const displayName = (row: Row): string => tr(nameOf(row))
  // Champs `subject` (FR canonique, pour la fiche + l'historique) + `subjectLabel` (traduit) d'une question.
  const subj = (row: Row): { subject: string; subjectLabel?: string } => {
    const canonical = nameOf(row)
    const shown = displayName(row)
    return shown === canonical ? { subject: canonical } : { subject: canonical, subjectLabel: shown }
  }

  // Groupes aléatoires de `size` lignes, qui peuvent se recouvrir d'une question à l'autre.
  // ~une question par ligne du pool ; les doublons exacts (petits jeux de données) sont écartés.
  const overlapGroups = (pool: Row[], size: number): Row[][] => {
    const n = Math.min(size, pool.length)
    if (n < 3) return []
    const groups: Row[][] = []
    const seen = new Set<string>()
    for (let i = 0; i < pool.length; i += 1) {
      const group = sample(pool, n)
      const key = group.map(nameOf).sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      groups.push(group)
    }
    return groups
  }
  const csvArticle = (row: Row): string | undefined => (articleColumn ? row[articleColumn] : undefined)
  const de = (row: Row): string => data.ofSubject(nameOf(row), csvArticle(row))
  const nouns = grammar.plural(noun, 2)

  // Colonne image du schéma (drapeau…) : sert aux questions « image + valeur ».
  const imageCol = Object.entries(schema.columns).find(([, s]) => s.include && s.isImage && s.unique)?.[0]

  const questions: Question[] = []
  const usedIds = new Set<string>()
  // Identité STABLE d'une question : dérivée de son contenu (catégorie + variante + sujet·s),
  // pas de l'ordre de génération. Une même question garde donc son id d'une régénération à
  // l'autre — c'est ce qui permet à l'historique « questions à retravailler » de la retrouver.
  // Séparateur + sel = octets de contrôle (0x01 / 0x02) : absents des données réelles.
  // Deux hachages 32 bits ≈ digest 64 bits, collision quasi impossible sur un vrai jeu.
  const qid = (parts: string[]): string => {
    const key = parts.join('')
    const base = `q${hashStr(key).toString(36)}${hashStr(key + '').toString(36)}`
    let id = base
    for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`
    usedIds.add(id)
    return id
  }

  for (const [col, spec] of Object.entries(schema.columns)) {
    if (!spec.include) continue
    // Une catégorie par colonne : le joueur filtre « capitale », « population »… depuis l'accueil.
    const categoryId = col
    const sep = spec.multivalueSeparator
    const atomsOf = (row: Row): string[] => {
      if (!hasValue(row[col])) return []
      const raw = sep ? String(row[col]).split(sep).map((s) => s.trim()).filter(Boolean) : [String(row[col])]
      return raw.map((v) => splitAnnotation(v).name)
    }
    // `domain` = valeurs distinctes affichables (traduites) ; sert de vivier de distracteurs.
    const domain = [...new Set(rows.flatMap(atomsOf).map(tr))]
    const rowsWith = rows.filter((row) => atomsOf(row).length > 0)
    const numRowsWith = spec.kind === 'number' ? rowsWith.filter((row) => Number.isFinite(asNumber(row[col]))) : rowsWith
    const label = labelFor(spec.label)
    const Label = grammar.cap(label)
    const unit = spec.unit ? unitFor(spec.unit) : undefined
    // Contexte commun aux gabarits d'une ligne : libellé de colonne + « de <sujet> ».
    const ctx = (row: Row) => ({ label, Label, noun, nouns, ...subj(row), ofSubject: de(row) })

    // Distracteurs pour un nombre : autres valeurs réelles de la colonne (années) puis valeurs perturbées.
    const numericDistractors = (target: number, n: number): string[] => {
      const out = new Set<number>()
      if (spec.isYear) {
        for (const v of sample([...new Set(numRowsWith.map((r) => asNumber(r[col])))].filter((v) => v !== target), n)) out.add(v)
      }
      const factors = spec.isYear ? [-18, -11, -6, 5, 9, 15, 24] : [0.4, 0.6, 0.75, 1.3, 1.6, 2.1]
      const step = spec.isYear ? 1 : niceStep(target * 2)
      // Colonne à valeurs négatives (ex. longitude, target < 0) : on force les perturbations à
      // rester négatives (symétrique du floor `Math.max(step, …)` utilisé pour un domaine positif).
      for (const f of shuffle(factors)) {
        if (out.size >= n) break
        const v = spec.isYear
          ? target + f
          : target >= 0
            ? Math.max(step, roundTo(target * f, step))
            : Math.min(-step, roundTo(target * f, step))
        if (v !== target && (target >= 0 ? v > 0 : v < 0) && (!spec.isYear || v <= 2024)) out.add(v)
      }
      return shuffle([...out]).slice(0, n).map((v) => formatNumericValue(v, spec.isYear, undefined, unit))
    }

    // ---- Colonne image (ex. drapeaux) : identifier l'entité d'après l'image ----
    if (spec.isImage && spec.unique) {
      for (const row of rowsWith) {
        const correct = displayName(row)
        const distractors = sample(rows.filter((r) => r !== row).map(displayName), CFG.image.choices - 1)
        if (distractors.length < CFG.image.choices - 1) continue
        questions.push({
          id: qid([col, 'image', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.image.difficulty, points: CFG.image.points, tags: [col],
          question: T('prompt.image', { noun, label }),
          topic: T('topic.labelSubject', ctx(row)), ...subj(row),
          explanation: T('explanation.image', { label, ofSubject: de(row), subject: correct }),
          imageUrl: row[col],
          imageAlt: T('alt.image', { label }),
          content: {
            multiple: false,
            answers: shuffle([correct, ...distractors]).map<AnswerOption>((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === correct })),
          },
        })
      }
    }

    // ---- Colonne texte : QCM + Vrai/Faux + texte à trous, une série par ligne ----
    if (spec.kind === 'string' && !spec.isImage) {
      for (const row of rowsWith) {
        const correctsFr = atomsOf(row)
        if (!correctsFr.length) continue
        const corrects = correctsFr.map(tr) // forme affichée (traduite) ; `correctsFr` pour les alias
        const about = T('topic.labelSubject', ctx(row))
        const fact = T('explanation.fact', { ...ctx(row), value: grammar.list(corrects) })

        if (corrects.length > 1) {
          const pool = domain.filter((v) => !corrects.includes(v))
          const nDist = Math.min(CFG.qcmMulti.options - corrects.length, pool.length)
          if (nDist >= 1) {
            const options = shuffle([...corrects, ...sample(pool, nDist)])
            questions.push({
              id: qid([col, 'qcm-multi', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.qcmMulti.difficulty, points: CFG.qcmMulti.points, tags: [col],
              question: T('prompt.qcmMulti', ctx(row)),
              topic: about, ...subj(row),
              explanation: fact,
              content: {
                multiple: true,
                answers: options.map<AnswerOption>((label, i) => ({ id: 'abcde'[i], label, isCorrect: corrects.includes(label) })),
              },
            })
          }
        } else {
          const correct = corrects[0]
          const distractors = sample(domain.filter((v) => v !== correct), CFG.qcm.choices - 1)
          if (distractors.length >= CFG.qcm.choices - 1) {
            questions.push({
              id: qid([col, 'qcm', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.qcm.difficulty, points: CFG.qcm.points, tags: [col],
              question: T('prompt.qcm', ctx(row)),
              topic: about, ...subj(row),
              explanation: T('explanation.fact', { ...ctx(row), value: correct }),
              content: {
                multiple: false,
                answers: shuffle([correct, ...distractors]).map<AnswerOption>((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === correct })),
              },
            })
          }
        }

        // Vrai/Faux : la vraie valeur (isTrue) ou une valeur empruntée à une autre ligne
        const showTrue = rand() < 0.5
        const shown = showTrue
          ? corrects[Math.floor(rand() * corrects.length)]
          : sample(domain.filter((v) => !corrects.includes(v)), 1)[0]
        if (shown) {
          // Colonne multivaleur (ex. religions, langues) : « {Label} … : {value}. » laisserait
          // croire que {value} est la seule valeur — on teste plutôt son appartenance à l'ensemble.
          const question = spec.multivalueSeparator
            ? T('prompt.booleanMulti', { ...ctx(row), Value: grammar.cap(shown) })
            : T('prompt.boolean', { ...ctx(row), value: shown })
          questions.push({
            id: qid([col, 'boolean', nameOf(row)]), type: 'boolean', category: categoryId, difficulty: CFG.boolean.difficulty, points: CFG.boolean.points, tags: [col],
            question,
            topic: about, ...subj(row),
            explanation: T('explanation.boolean', { verdict: showTrue ? tpl['word.true'] : tpl['word.false'], fact }),
            content: { isTrue: showTrue },
          })
        }

        // Texte à trous : on masque la valeur. N'a de sens que pour une seule valeur attendue —
        // à plusieurs (ex. langues, organisations), une case à remplir accepterait n'importe
        // laquelle comme réponse complète ; le QCM à réponses multiples ci-dessus teste déjà ça.
        if (corrects.length === 1) {
          const expected = [...new Set(correctsFr.flatMap((v) => [tr(v), ...(opts.aliases?.[v] ?? [])]))]
          questions.push({
            id: qid([col, 'cloze', nameOf(row)]), type: 'cloze', category: categoryId, difficulty: CFG.cloze.difficulty, points: CFG.cloze.points, tags: [col],
            question: T('prompt.cloze', ctx(row)),
            topic: about, ...subj(row),
            explanation: fact,
            content: { expectedAnswers: expected, caseSensitive: false },
          })
        }
      }
    }

    // ---- QCM inversé (colonnes uniques) : une question par ligne ----
    if (spec.kind === 'string' && !spec.isImage && spec.unique && rows.length > CFG.qcmBackward.choices) {
      for (const row of rowsWith) {
        const correct = displayName(row)
        const distractors = sample(rows.filter((r) => r !== row).map(displayName), CFG.qcmBackward.choices - 1)
        questions.push({
          id: qid([col, 'qcm-inverse', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.qcmBackward.difficulty, points: CFG.qcmBackward.points, tags: [col],
          question: T('prompt.inverse', { noun, label, value: tr(row[col]) }),
          topic: T('topic.labelSubject', ctx(row)), ...subj(row),
          explanation: T('explanation.fact', { ...ctx(row), value: tr(row[col]) }),
          content: {
            multiple: false,
            answers: shuffle([correct, ...distractors]).map<AnswerOption>((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === correct })),
          },
        })
      }
    }

    // ---- Estimation (numeric) : une question par ligne ----
    if (spec.kind === 'number') {
      for (const row of numRowsWith) {
        const target = asNumber(row[col])
        let min: number, max: number, step: number, tolerance: number
        if (spec.isYear) {
          min = target - 40; max = Math.min(2030, target + 40); step = 1; tolerance = 4
        } else {
          step = niceStep(target * 2)
          // Domaine négatif (ex. longitude) : mêmes proportions, en miroir — la borne côté zéro
          // est plafonnée à 0 (au lieu d'être plancherée à 0 pour un domaine positif).
          if (target >= 0) {
            min = Math.max(0, roundTo(target * 0.3, step))
            max = roundTo(target * 2.2, step)
          } else {
            min = roundTo(target * 2.2, step)
            max = Math.min(0, roundTo(target * 0.3, step))
          }
          tolerance = Math.max(step, roundTo(target * 0.12, step))
        }
        questions.push({
          id: qid([col, 'numeric', nameOf(row)]), type: 'numeric', category: categoryId, difficulty: CFG.estimate.difficulty, points: CFG.estimate.points, tags: [col],
          question: spec.isYear
            ? T('prompt.numericYear', ctx(row))
            : T(unit ? 'prompt.estimateUnit' : 'prompt.estimate', { ...ctx(row), unit: unit ?? '' }),
          topic: T('topic.labelSubject', ctx(row)), ...subj(row),
          explanation: T('explanation.fact', { ...ctx(row), value: `${formatNumericValue(target, spec.isYear, undefined, unit)}${unit && !spec.isYear ? ` ${unit}` : ''}` }),
          content: { min, max, step, target, tolerance, isYear: spec.isYear, ...(unit && !spec.isYear ? { unit } : {}) },
        })
      }
    }

    // ---- Classement (ordering) : groupes aléatoires qui se recouvrent ----
    // Une seule ligne par valeur AFFICHÉE distincte au départ (deux ex æquo, même arrondis à des
    // valeurs brutes différentes, rendraient l'ordre attendu ambigu dans l'explication).
    if (spec.kind === 'number') {
      const distinct = [...new Map(shuffle(numRowsWith).map((r) => [formatNumericValue(asNumber(r[col]), spec.isYear, undefined, unit), r] as const)).values()]
      const direction: 'asc' | 'desc' = spec.isYear ? 'asc' : 'desc'
      const idOf = (r: Row): string => `o-${hashStr(nameOf(r) + col)}`
      for (const group of overlapGroups(distinct, CFG.order.groupSize)) {
        const idMembers = [...group].map(nameOf).sort() // clé d'id : noms FR canoniques
        const members = [...group].map(displayName).sort((a, b) => a.localeCompare(b, locale))
        const sorted = [...group].sort((a, b) =>
          direction === 'asc' ? asNumber(a[col]) - asNumber(b[col]) : asNumber(b[col]) - asNumber(a[col]))
        questions.push({
          id: qid([col, 'ordering', ...idMembers]), type: 'ordering', category: categoryId, difficulty: CFG.order.difficulty, points: CFG.order.points, tags: [col],
          question: T('prompt.ordering', { nouns, label, direction: grammar.direction(direction) }),
          topic: T('topic.labelList', { Label, list: members.join(', ') }),
          explanation: sorted
            .map((r) => `${displayName(r)} (${formatNumericValue(asNumber(r[col]), spec.isYear, undefined, unit)}${unit && !spec.isYear ? ` ${unit}` : ''})`)
            .join(' › '),
          content: {
            items: shuffle(group).map<OrderingItem>((r) => ({ id: idOf(r), label: displayName(r) })),
            correctOrder: sorted.map(idOf),
          },
        })
      }
    }

    // ---- Colonne nombre : QCM + Vrai/Faux + texte à trous (années), une série par ligne ----
    if (spec.kind === 'number') {
      for (const row of numRowsWith) {
        const target = asNumber(row[col])
        const shown = formatNumericValue(target, spec.isYear, undefined, unit)
        const unitSuffix = unit && !spec.isYear ? ` ${unit}` : ''
        const about = T('topic.labelSubject', ctx(row))
        const fact = T('explanation.fact', { ...ctx(row), value: `${shown}${unitSuffix}` })

        const dist = numericDistractors(target, CFG.qcm.choices - 1)
        if (dist.length >= CFG.qcm.choices - 1) {
          questions.push({
            id: qid([col, 'num-qcm', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.qcm.difficulty, points: CFG.qcm.points, tags: [col],
            question: spec.isYear
              ? T('prompt.numericYear', ctx(row))
              : T(unit ? 'prompt.numericValueUnit' : 'prompt.qcm', { ...ctx(row), unit: unit ?? '' }),
            topic: about, ...subj(row),
            explanation: fact,
            content: {
              multiple: false,
              answers: shuffle([shown, ...dist]).map<AnswerOption>((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === shown })),
            },
          })
        }

        // Vrai/Faux : la vraie valeur, ou une valeur perturbée
        const showTrue = rand() < 0.5
        const shownVal = showTrue ? shown : numericDistractors(target, 1)[0]
        if (shownVal) {
          questions.push({
            id: qid([col, 'num-boolean', nameOf(row)]), type: 'boolean', category: categoryId, difficulty: CFG.boolean.difficulty, points: CFG.boolean.points, tags: [col],
            question: T('prompt.boolean', { ...ctx(row), value: `${shownVal}${unitSuffix}` }),
            topic: about, ...subj(row),
            explanation: T('explanation.boolean', { verdict: showTrue ? tpl['word.true'] : tpl['word.false'], fact }),
            content: { isTrue: showTrue },
          })
        }

        // Texte à trous : années seulement (taper une population exacte serait absurde)
        if (spec.isYear) {
          questions.push({
            id: qid([col, 'num-cloze', nameOf(row)]), type: 'cloze', category: categoryId, difficulty: CFG.cloze.difficulty, points: CFG.cloze.points, tags: [col],
            question: T('prompt.cloze', ctx(row)),
            topic: about, ...subj(row),
            explanation: fact,
            content: { expectedAnswers: [String(target), shown], caseSensitive: false },
          })
        }
      }
    }

    // ---- QCM inversé sur un nombre (colonnes uniques : une seule bonne réponse possible) ----
    if (spec.kind === 'number' && spec.unique && rows.length > CFG.qcmBackward.choices) {
      for (const row of numRowsWith) {
        const shown = `${formatNumericValue(asNumber(row[col]), spec.isYear, undefined, unit)}${unit && !spec.isYear ? ` ${unit}` : ''}`
        const correct = displayName(row)
        const distractors = sample(rows.filter((r) => r !== row).map(displayName), CFG.qcmBackward.choices - 1)
        questions.push({
          id: qid([col, 'num-inverse', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.qcmBackward.difficulty, points: CFG.qcmBackward.points, tags: [col],
          question: T('prompt.inverse', { noun, label, value: shown }),
          topic: T('topic.labelSubject', ctx(row)), ...subj(row),
          explanation: T('explanation.fact', { ...ctx(row), value: shown }),
          content: {
            multiple: false,
            answers: shuffle([correct, ...distractors]).map<AnswerOption>((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === correct })),
          },
        })
      }
    }

    // ---- Association sur un nombre : groupes recouvrants, une ligne par valeur AFFICHÉE distincte
    // (deux options identiques une fois arrondies seraient indiscernables à associer) ----
    if (spec.kind === 'number') {
      const distinct = [...new Map(shuffle(numRowsWith).map((r) => [formatNumericValue(asNumber(r[col]), spec.isYear, undefined, unit), r] as const)).values()]
      const leftId = (r: Row): string => `l-${hashStr(nameOf(r) + '#' + col)}`
      const rightId = (r: Row): string => `r-${hashStr(String(asNumber(r[col])) + col)}`
      const valOf = (r: Row): string => `${formatNumericValue(asNumber(r[col]), spec.isYear, undefined, unit)}${unit && !spec.isYear ? ` ${unit}` : ''}`
      for (const group of overlapGroups(distinct, CFG.matching.groupSize)) {
        const idMembers = [...group].map(nameOf).sort()
        const members = [...group].map(displayName).sort((a, b) => a.localeCompare(b, locale))
        questions.push({
          id: qid([col, 'num-matching', ...idMembers]), type: 'matching', category: categoryId, difficulty: CFG.matching.difficulty, points: CFG.matching.points, tags: [col],
          question: T('prompt.matching', { noun, label }),
          topic: T('topic.labelList', { Label, list: members.join(', ') }),
          explanation: group.map((r) => `${displayName(r)} → ${valOf(r)}`).join(' · '),
          content: {
            left: group.map<MatchingItem>((r) => ({ id: leftId(r), label: displayName(r) })),
            right: shuffle(group).map<MatchingItem>((r) => ({ id: rightId(r), label: valOf(r) })),
            correctPairs: Object.fromEntries(group.map((r) => [leftId(r), rightId(r)])),
          },
        })
      }
    }

    // ---- Question image + année : reconnaître le drapeau ET connaître l'année ----
    if (spec.kind === 'number' && spec.isYear && imageCol) {
      const imgLabel = labelFor(schema.columns[imageCol].label)
      for (const row of numRowsWith) {
        if (!hasValue(row[imageCol])) continue
        const target = asNumber(row[col])
        const shown = formatNumericValue(target, true)
        const dist = numericDistractors(target, CFG.image.choices - 1)
        if (dist.length < CFG.image.choices - 1) continue
        questions.push({
          id: qid([col, 'image-year', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.order.difficulty, points: CFG.order.points, tags: [col],
          question: T('prompt.imageYear', { imageLabel: imgLabel, noun, label }),
          topic: T('topic.labelSubject', ctx(row)), ...subj(row),
          explanation: T('explanation.imageYear', { imageLabel: imgLabel, ofSubject: de(row), subject: displayName(row), label, value: shown }),
          imageUrl: row[imageCol],
          imageAlt: T('alt.image', { label: imgLabel }),
          content: {
            multiple: false,
            answers: shuffle([shown, ...dist]).map<AnswerOption>((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === shown })),
          },
        })
      }
    }

    // ---- Association (matching) : groupes aléatoires qui se recouvrent ----
    if (spec.kind === 'string' && !spec.isImage && spec.unique) {
      const leftId = (r: Row): string => `l-${hashStr(nameOf(r))}`
      const rightId = (r: Row): string => `r-${hashStr(r[col])}`
      for (const group of overlapGroups(rowsWith, CFG.matching.groupSize)) {
        const idMembers = [...group].map(nameOf).sort()
        const members = [...group].map(displayName).sort((a, b) => a.localeCompare(b, locale))
        questions.push({
          id: qid([col, 'matching', ...idMembers]), type: 'matching', category: categoryId, difficulty: CFG.matching.difficulty, points: CFG.matching.points, tags: [col],
          question: T('prompt.matching', { noun, label }),
          topic: T('topic.labelList', { Label, list: members.join(', ') }),
          explanation: group.map((r) => `${displayName(r)} → ${tr(r[col])}`).join(' · '),
          content: {
            left: group.map<MatchingItem>((r) => ({ id: leftId(r), label: displayName(r) })),
            right: shuffle(group).map<MatchingItem>((r) => ({ id: rightId(r), label: tr(r[col]) })),
            correctPairs: Object.fromEntries(group.map((r) => [leftId(r), rightId(r)])),
          },
        })
      }
    }
  }

  // ---- Silhouette : reconnaître un territoire à son contour (indépendant des colonnes) ----
  if (opts.shapes) {
    const withShape = rows.filter((r) => opts.shapes![nameOf(r)])
    for (const row of withShape) {
      const key = nameOf(row) // nom FR : id de question + clé de `shapes`
      const correct = displayName(row)
      const distractors = sample(withShape.filter((r) => r !== row).map(displayName), CFG.image.choices - 1)
      if (distractors.length < CFG.image.choices - 1) continue
      questions.push({
        id: qid(['silhouette', key]), type: 'qcm', category: 'silhouette', difficulty: CFG.image.difficulty, points: CFG.image.points, tags: ['silhouette'],
        question: T('prompt.silhouette', { noun }),
        topic: T('topic.silhouette', { ofSubject: de(row) }), ...subj(row),
        explanation: T('explanation.silhouette', { ofSubject: de(row), subject: correct }),
        shapeSvg: opts.shapes[key],
        imageAlt: T('alt.silhouette', { noun }),
        content: {
          multiple: false,
          answers: shuffle([correct, ...distractors]).map<AnswerOption>((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === correct })),
        },
      })
    }
  }

  // Les catégories proposées au joueur = les colonnes qui ont effectivement produit des questions
  // (dans l'ordre du tableau source), plus « Silhouette » si des contours ont été fournis.
  const used = new Set(questions.map((q) => q.category))
  const categories = [
    ...Object.entries(schema.columns).filter(([col]) => used.has(col)).map(([col, spec]) => ({ id: col, label: grammar.cap(labelFor(spec.label)) })),
    ...(used.has('silhouette') ? [{ id: 'silhouette', label: tpl['word.silhouetteCategory'] }] : []),
  ]

  return {
    version: '1.0',
    metadata: {
      title: schema.title,
      author: opts.author ?? 'Quiz',
      createdAt: new Date().toISOString().slice(0, 10),
      description: T('meta.description', { count: formatNumber(questions.length), rows: formatNumber(rows.length), nouns, seed: opts.seed }),
    },
    categories,
    questions: shuffle(questions),
  }
}

export const randomSeed = (): string => Math.random().toString(36).slice(2, 8)
