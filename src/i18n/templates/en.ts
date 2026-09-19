import type { TemplateKey } from './index'

/** English question templates. First-draft wording — to review with a native speaker before
 * `en` is exposed in the language picker (i18n plan, phase 3). */
export const en: Record<TemplateKey, string> = {
  'prompt.image': 'Which {noun} does this {label} represent?',
  'prompt.qcm': '{Label} {ofSubject}?',
  'prompt.qcmMulti': '{Label} {ofSubject}? (multiple answers)',
  'prompt.inverse': 'Which {noun} has {label} "{value}"?',
  'prompt.boolean': '{Label} {ofSubject}: {value}.',
  'prompt.booleanMulti': '{Value} is one of the {label} {ofSubject}.',
  'prompt.cloze': '{Label} {ofSubject}: ___',
  'prompt.numericYear': 'In what year: {label} {ofSubject}?',
  'prompt.estimate': 'Estimate: {label} {ofSubject}.',
  'prompt.estimateUnit': 'Estimate: {label} {ofSubject} (in {unit}).',
  'prompt.numericValueUnit': '{Label} {ofSubject} (in {unit})?',
  'prompt.ordering': 'Order these {nouns} by {label} ({direction}).',
  'prompt.matching': 'Match each {noun} to: {label}.',
  'prompt.imageYear': 'This {imageLabel} represents a {noun}. In what year: {label}?',
  'prompt.silhouette': 'Which {noun} has this outline?',

  'explanation.fact': '{Label} {ofSubject}: {value}.',
  'explanation.image': 'This {label} belongs to {subject}.',
  'explanation.boolean': '{verdict}. {fact}',
  'explanation.imageYear': 'This {imageLabel} belongs to {subject} — {label}: {value}.',
  'explanation.silhouette': 'This outline belongs to {subject}.',

  'topic.labelSubject': '{Label} {ofSubject}',
  'topic.labelList': '{Label}: {list}',
  'topic.silhouette': 'Outline {ofSubject}',

  'alt.image': 'A {label}.',
  'alt.silhouette': 'The outline of a {noun}.',

  'meta.description': '{count} questions generated from {rows} {nouns} (seed "{seed}").',
  'word.true': 'True',
  'word.false': 'False',
  'word.silhouetteCategory': 'Outline',
}
