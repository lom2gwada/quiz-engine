import type { TemplateKey } from './index'

/** Modèl kesyon an kreyòl ayisyen (òtograf IPN). Premye vèsyon — pou yon moun ki pale kreyòl
 * natif revize (atik defini postpoze, fòm posesyon). */
export const ht: Record<TemplateKey, string> = {
  'prompt.image': 'Ki {noun} {label} sa a reprezante?',
  'prompt.qcm': '{Label} {ofSubject}?',
  'prompt.qcmMulti': '{Label} {ofSubject}? (plizyè repons)',
  'prompt.inverse': 'Ki {noun} ki gen {label} «{value}»?',
  'prompt.boolean': '{Label} {ofSubject}: {value}.',
  'prompt.booleanMulti': '{Value} fè pati {label} {ofSubject}.',
  'prompt.cloze': '{Label} {ofSubject}: ___',
  'prompt.numericYear': 'Nan ki ane: {label} {ofSubject}?',
  'prompt.estimate': 'Estime: {label} {ofSubject}.',
  'prompt.estimateUnit': 'Estime: {label} {ofSubject} (an {unit}).',
  'prompt.numericValueUnit': '{Label} {ofSubject} (an {unit})?',
  'prompt.ordering': 'Klase {nouns} sa yo pa {label} ({direction}).',
  'prompt.matching': 'Asosye chak {noun} ak: {label}.',
  'prompt.imageYear': '{imageLabel} sa a se pou yon {noun}. Nan ki ane: {label}?',
  'prompt.silhouette': 'Ki {noun} ki gen kontou sa a?',

  'explanation.fact': '{Label} {ofSubject}: {value}.',
  'explanation.image': '{label} sa a se pou {subject}.',
  'explanation.boolean': '{verdict}. {fact}',
  'explanation.imageYear': '{imageLabel} sa a se pou {subject} — {label}: {value}.',
  'explanation.silhouette': 'Kontou sa a se pou {subject}.',

  'topic.labelSubject': '{Label} {ofSubject}',
  'topic.labelList': '{Label}: {list}',
  'topic.silhouette': 'Kontou {ofSubject}',

  'alt.image': 'Yon {label}.',
  'alt.silhouette': 'Kontou yon {noun}.',

  'meta.description': '{count} kesyon jenere apati {rows} {nouns} (seed «{seed}»).',
  'word.true': 'Vre',
  'word.false': 'Fo',
  'word.silhouetteCategory': 'Kontou',
}
