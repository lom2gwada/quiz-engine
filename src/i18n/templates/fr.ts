/** Gabarits FR — SOURCE DE VÉRITÉ. Reproduisent mot pour mot les énoncés autrefois écrits en
 * dur dans `quizGenerator.ts` (les tests de génération verrouillent ces formulations).
 *
 * Placeholders : `{label}` (libellé de colonne, minuscule) · `{Label}` (idem, capitalisé) ·
 * `{subject}` (nom du sujet) · `{ofSubject}` (« de la Guadeloupe »… via la grammaire) ·
 * `{noun}` / `{nouns}` (nom d'un élément, sing./plur.) · `{value}` · `{unit}` · `{list}` ·
 * `{direction}` · `{imageLabel}` · `{verdict}` · `{fact}` · `{count}` / `{rows}` / `{seed}`. */
export const fr = {
  // — énoncés —
  'prompt.image': 'Quel {noun} ce {label} représente-t-il ?',
  'prompt.qcm': '{Label} {ofSubject} ?',
  'prompt.qcmMulti': '{Label} {ofSubject} ? (plusieurs réponses)',
  'prompt.inverse': 'Quel {noun} a pour {label} « {value} » ?',
  'prompt.boolean': '{Label} {ofSubject} : {value}.',
  // Colonne multivaleur (ex. religions, langues) : « {Label} … : {value}. » laisserait croire que
  // {value} est la SEULE valeur — on teste plutôt l'appartenance à l'ensemble des valeurs.
  'prompt.booleanMulti': '{Value} fait partie des {label} {ofSubject}.',
  'prompt.cloze': '{Label} {ofSubject} : ___',
  'prompt.numericYear': 'En quelle année : {label} {ofSubject} ?',
  'prompt.estimate': 'Estimez : {label} {ofSubject}.',
  'prompt.estimateUnit': 'Estimez : {label} {ofSubject} (en {unit}).',
  'prompt.numericValueUnit': '{Label} {ofSubject} (en {unit}) ?',
  'prompt.ordering': 'Classez ces {nouns} par {label} (ordre {direction}).',
  'prompt.matching': 'Associez chaque {noun} à : {label}.',
  'prompt.imageYear': 'Ce {imageLabel} représente un {noun}. En quelle année : {label} ?',
  'prompt.silhouette': 'Quel {noun} a cette silhouette ?',

  // — explications —
  'explanation.fact': '{Label} {ofSubject} : {value}.',
  'explanation.image': 'Ce {label} est celui {ofSubject}.',
  'explanation.boolean': '{verdict}. {fact}',
  'explanation.imageYear': 'Ce {imageLabel} est celui {ofSubject} — {label} : {value}.',
  'explanation.silhouette': 'Cette silhouette est celle {ofSubject}.',

  // — libellés neutres (historique « à retravailler ») —
  'topic.labelSubject': '{Label} {ofSubject}',
  'topic.labelList': '{Label} : {list}',
  'topic.silhouette': 'Silhouette {ofSubject}',

  // — textes alternatifs d'image —
  'alt.image': 'Un {label}.',
  'alt.silhouette': 'Silhouette d’un {noun}.',

  // — divers —
  'meta.description': '{count} questions générées à partir de {rows} {nouns} (seed « {seed} »).',
  'word.true': 'Vrai',
  'word.false': 'Faux',
  'word.silhouetteCategory': 'Silhouette',
} satisfies Record<string, string>
