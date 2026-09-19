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
}
export type FicheDecorator = (row: Row, ctx: { name: string; canonical: string }) => FicheDecor

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
