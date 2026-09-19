import type { TemplateKey } from './index'

/** Plantillas de preguntas en español. Primera versión — revisar con un hablante nativo antes
 * de considerar el español como definitivo (concordancia de género de `{label}`). */
export const es: Record<TemplateKey, string> = {
  'prompt.image': '¿Qué {noun} representa esta {label}?',
  'prompt.qcm': '¿{Label} {ofSubject}?',
  'prompt.qcmMulti': '¿{Label} {ofSubject}? (varias respuestas)',
  'prompt.inverse': '¿Qué {noun} tiene como {label} «{value}»?',
  'prompt.boolean': '{Label} {ofSubject}: {value}.',
  // Sans article : « las/los {label} » demanderait d'accorder en genre (« los idiomas » mais
  // « las religiones »), que le gabarit ne peut pas connaître pour une colonne quelconque.
  'prompt.booleanMulti': '{Value} forma parte de {label} {ofSubject}.',
  'prompt.cloze': '{Label} {ofSubject}: ___',
  'prompt.numericYear': '¿En qué año: {label} {ofSubject}?',
  'prompt.estimate': 'Estima: {label} {ofSubject}.',
  'prompt.estimateUnit': 'Estima: {label} {ofSubject} (en {unit}).',
  'prompt.numericValueUnit': '¿{Label} {ofSubject} (en {unit})?',
  'prompt.ordering': 'Ordena estos {nouns} por {label} ({direction}).',
  'prompt.matching': 'Asocia cada {noun} con: {label}.',
  'prompt.imageYear': 'Esta {imageLabel} representa un {noun}. ¿En qué año: {label}?',
  'prompt.silhouette': '¿Qué {noun} tiene esta silueta?',

  'explanation.fact': '{Label} {ofSubject}: {value}.',
  'explanation.image': 'Esta {label} pertenece a {subject}.',
  'explanation.boolean': '{verdict}. {fact}',
  'explanation.imageYear': 'Esta {imageLabel} pertenece a {subject} — {label}: {value}.',
  'explanation.silhouette': 'Esta silueta pertenece a {subject}.',

  'topic.labelSubject': '{Label} {ofSubject}',
  'topic.labelList': '{Label}: {list}',
  'topic.silhouette': 'Silueta {ofSubject}',

  'alt.image': 'Una {label}.',
  'alt.silhouette': 'Silueta de un {noun}.',

  'meta.description': '{count} preguntas generadas a partir de {rows} {nouns} (seed «{seed}»).',
  'word.true': 'Verdadero',
  'word.false': 'Falso',
  'word.silhouetteCategory': 'Silueta',
}
