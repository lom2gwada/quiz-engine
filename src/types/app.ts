import type { ComponentType, ReactNode } from 'react'
import type { DataI18n } from '../i18n/data'
import type { Locale } from '../i18n/locale'
import type { GenSchema, Row } from '../utils/quizGenerator'

/** Contexte donné au rendu d'une vue propre à un jeu de données. */
export interface DatasetViewContext {
  dataset: Dataset
  /** Ouvre la fiche (modale) d'un sujet, par sa valeur canonique. */
  openFiche: (subject: string) => void
  back: () => void
}

/** Page supplémentaire qu'un jeu de données peut apporter (carte, tableau périodique…). Le moteur
 *  ne sait rien de son contenu : il place le bouton d'accès et affiche `render`. */
export interface DatasetView {
  id: string
  icon: string
  /** Clé de message du libellé du bouton (à fournir via `EngineConfig.messages`). */
  labelKey: string
  /** Où placer le bouton : en-tête de l'accueil, ou barre d'outils de la page Fiches (« retour » ramène alors à Fiches). */
  entry: 'start' | 'atlas'
  render: (ctx: DatasetViewContext) => ReactNode
}

/** Éléments décoratifs propres au jeu de données dans l'en-tête d'une fiche (silhouette, tuile, carte…). */
export interface FicheDecor {
  /** Avant le nom. */
  lead?: ReactNode
  /** Après le nom (et le drapeau éventuel). */
  trail?: ReactNode
  /** Titre sans l'article de la colonne `article` (« Hierro », pas « el Hierro ») : l'article sert aux phrases, pas à un titre de fiche. */
  hideArticle?: boolean
}
export type FicheDecorator = (row: Row, ctx: { name: string; canonical: string }) => FicheDecor

/** Phrases lues à voix haute sur une fiche, par locale. Une phrase est un gabarit avec des marqueurs :
 *  - `{Name}` / `{name}` : le sujet avec son article (« La Martinique » / « la Martinique »), `{of_name}` : « de la Martinique » ;
 *  - `{colonne}` : valeur de la colonne (traduite, nombre formaté), `{colonne:2}` : ses 2 premières valeurs si elle est multivaleur ;
 *  - `[ … ]` : segment optionnel, retiré si l'un de ses marqueurs est vide.
 *  Une phrase dont un marqueur (hors segment optionnel) est vide est ignorée. Locale absente : repli sur le français.
 *  Les unités s'écrivent en toutes lettres dans le gabarit (« kilomètres carrés ») : c'est ce que la voix doit dire. */
export type SpeechTemplates = Partial<Record<Locale, string[]>>

/** Ce que la carte d'une question « Localisation » reçoit : le territoire à trouver, celui actuellement désigné, et le rappel de
 *  désignation (valeur FR canonique du territoire cliqué). */
export interface MapQuestionProps {
  target: string
  selected?: string
  onPick: (canonical: string) => void
  /** Correction : la carte n'est plus cliquable, elle montre la bonne réponse (`target`) et, si elle diffère, celle du joueur (`selected`). */
  review?: boolean
}

/** Questions « Cliquez sur X » : `targets` = valeurs canoniques désignables, `render` affiche la carte cliquable (propre à l'appli). */
export interface DatasetMap {
  /** Formulation des questions : « sur la carte » (défaut) ou « sur le tableau » (tableau périodique). */
  kind?: 'map' | 'table'
  targets: string[]
  render: (props: MapQuestionProps) => ReactNode
}

/** Un groupe de catégories sur l'accueil (« Géographie », « Économie »…). Une catégorie est une colonne du jeu de données
 *  (son identifiant = le nom de la colonne), plus `silhouette` et `map` pour les questions visuelles. */
export interface CategoryGroup {
  id: string
  /** Intitulé par locale ; repli sur le français. */
  labels: Partial<Record<Locale, string>>
  /** Identifiants des catégories du groupe, dans l'ordre d'affichage. Celles que l'appli ne cite pas vont dans « Autres ». */
  categories: string[]
}

/** Filtre « Territoires » de l'accueil : restreindre les questions à une partie des sujets (lignes du jeu de données). Des raccourcis
 *  par valeur d'une colonne (groupe géographique, pays de rattachement…) et un choix un par un. */
export interface SubjectFilter {
  /** Intitulé de la section par locale (« Territoires ») ; repli sur le français. */
  labels: Partial<Record<Locale, string>>
  /** Colonnes dont chaque valeur est un raccourci qui (dé)sélectionne tous les sujets qui l'ont. */
  by: { column: string; labels: Partial<Record<Locale, string>> }[]
}

/** Poids minimal de catégories rares dans un tirage « toutes catégories » : sans lui, 38 drapeaux se noient parmi des milliers de
 *  questions chiffrées. Appliqué aux modes de partie quand aucune catégorie n'est choisie (ou toutes). */
export interface CategoryBoost {
  /** Identifiants des catégories à mettre en avant. */
  categories: string[]
  /** Part visée de ces catégories dans le tirage (0–1) ; ex. 0,1 = une question sur dix. */
  share: number
}

import type { AnswerMatcher } from '../utils/answerMatch'
export type { AnswerMatcher }

/** Date de mise à jour de l'ensemble des données et sources, affichées sur les fiches, la page Fiches, l'accueil et la correction. */
export interface DataInfo {
  /** Date de dernière mise à jour des données, `AAAA-MM-JJ`. */
  updatedAt: string
  /** Sources des données (nom, et lien si on en a un). */
  sources?: { label: string; url?: string }[]
}

export interface Dataset {
  rows: Row[]
  schema: GenSchema
  aliases?: Record<string, string[]>
  /** Silhouettes SVG par valeur canonique du sujet (questions « quelle forme ? »). */
  shapes?: Record<string, string>
  i18n?: DataI18n
  /** Nom d'un élément par locale (le CSV n'a pas cette info) ; défaut = `schema.noun`. */
  nouns?: Partial<Record<Locale, string>>
  /** Titre du quiz par locale ; défaut = `schema.title`. La clé d'historique reste `schema.title`. */
  titles?: Partial<Record<Locale, string>>
  /** Vrai uniquement pour le jeu de données construit depuis la base (`QuizAppSpec.remote`) : seul
   *  celui-ci a une table éditable en face, donc seul lui autorise l'édition admin des fiches. */
  editable?: boolean
  ficheDecor?: FicheDecorator
  /** Absent : pas de bouton « Écouter » sur les fiches. */
  speech?: SpeechTemplates
  /** Présentation générale du jeu de données (l'ensemble, pas une fiche), lue par un bouton « Écouter »
   *  sur la page d'accueil. Mêmes phrases fixes par locale que `speech`, sans marqueurs de gabarit
   *  puisqu'il n'y a pas de ligne à interpoler — juste `SpeechTemplates` pour la locale de repli (français). */
  intro?: SpeechTemplates
  /** Regroupement des catégories sur l'accueil ; absent : une seule liste à plat. */
  categoryGroups?: CategoryGroup[]
  /** Absent : aucune mention de date ni de source. */
  dataInfo?: DataInfo
  /** Comparaison de réponse propre à une catégorie (clé = identifiant de catégorie, c'est-à-dire le nom de colonne), à la place de la
   *  comparaison de chaînes du moteur, pour les questions à saisie : notation métier (configuration électronique, formule chimique…).
   *  Utilisée au jeu, à la correction, en révision et dans les statistiques. */
  answerMatchers?: Record<string, AnswerMatcher>
  /** Catégories de personnes (président, Premier ministre…) où le nom de famille seul est accepté en plus du nom complet (le prénom seul reste refusé). */
  lastNameCategories?: string[]
  /** Tri par défaut de la page Fiches (et ordre « précédent / suivant » d'une fiche) : une colonne numérique ; absent : par nom. */
  atlasSort?: { column: string; direction?: 'asc' | 'desc' }
  /** Absent : pas de filtre par sujet sur l'accueil. */
  subjectFilter?: SubjectFilter
  /** Absent : le tirage reflète la taille réelle de chaque catégorie. */
  boost?: CategoryBoost
  map?: DatasetMap
  views?: DatasetView[]
}

/** Réglages du panneau de génération qu'on partage entre utilisateurs (table `<prefixe>_schema`). */
export interface SchemaConfig {
  noun: string
  title: string
  columns: Record<string, { include?: boolean; multivalueSeparator?: string }>
}

/** Accès à la version éditable du jeu de données en base. */
export interface RemoteDataset {
  /** `null` si indisponible : l'appli reste alors sur le CSV embarqué. */
  fetchRows: () => Promise<Row[] | null>
  fetchSchemaConfig: () => Promise<SchemaConfig | null>
  /** Réservé aux admins (RLS). */
  saveSchemaConfig: (schema: GenSchema) => Promise<void>
  /** Réservé aux admins (RLS). `key` = valeur canonique du sujet. */
  updateRow: (key: string, patch: Partial<Row>) => Promise<void>
}

/** Tout ce qu'une application fournit au moteur. */
export interface QuizAppSpec {
  /** Seed du tirage initial (chargement calme, titre stable pour l'agrégation d'historique). */
  seed: string
  /** Titre/auteur du quiz de secours, si le CSV embarqué est illisible. */
  fallbackTitle: string
  bundledCsv: string
  /** Construit le jeu de données depuis des lignes (CSV embarqué au démarrage, base ensuite). */
  buildDataset: (rows: Row[], schemaConfig: SchemaConfig | null) => Dataset
  remote?: RemoteDataset
  /** Fond décoratif de l'appli (sous le thème « carte » notamment). */
  Background?: ComponentType
}
