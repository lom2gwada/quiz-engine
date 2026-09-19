import type { TemplateKey } from './index'

/** Nederlandse vraagsjablonen. Eerste versie — nog na te lezen door een moedertaalspreker
 * (lidwoorden, terse formuleringen). */
export const nl: Record<TemplateKey, string> = {
  'prompt.image': 'Welk {noun} stelt deze {label} voor?',
  'prompt.qcm': '{Label} {ofSubject}?',
  'prompt.qcmMulti': '{Label} {ofSubject}? (meerdere antwoorden)',
  'prompt.inverse': 'Welk {noun} heeft als {label} "{value}"?',
  'prompt.boolean': '{Label} {ofSubject}: {value}.',
  'prompt.booleanMulti': '{Value} is een van de {label} {ofSubject}.',
  'prompt.cloze': '{Label} {ofSubject}: ___',
  'prompt.numericYear': 'In welk jaar: {label} {ofSubject}?',
  'prompt.estimate': 'Schat: {label} {ofSubject}.',
  'prompt.estimateUnit': 'Schat: {label} {ofSubject} (in {unit}).',
  'prompt.numericValueUnit': '{Label} {ofSubject} (in {unit})?',
  'prompt.ordering': 'Rangschik deze {nouns} op {label} ({direction}).',
  'prompt.matching': 'Koppel elk {noun} aan: {label}.',
  'prompt.imageYear': 'Deze {imageLabel} hoort bij een {noun}. In welk jaar: {label}?',
  'prompt.silhouette': 'Welk {noun} heeft deze omtrek?',

  'explanation.fact': '{Label} {ofSubject}: {value}.',
  'explanation.image': 'Deze {label} hoort bij {subject}.',
  'explanation.boolean': '{verdict}. {fact}',
  'explanation.imageYear': 'Deze {imageLabel} hoort bij {subject} — {label}: {value}.',
  'explanation.silhouette': 'Deze omtrek hoort bij {subject}.',

  'topic.labelSubject': '{Label} {ofSubject}',
  'topic.labelList': '{Label}: {list}',
  'topic.silhouette': 'Omtrek {ofSubject}',

  'alt.image': 'Een {label}.',
  'alt.silhouette': 'De omtrek van een {noun}.',

  'meta.description': '{count} vragen gegenereerd uit {rows} {nouns} (seed "{seed}").',
  'word.true': 'Waar',
  'word.false': 'Onwaar',
  'word.silhouetteCategory': 'Omtrek',
}
