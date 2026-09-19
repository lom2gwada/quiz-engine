import { table } from '../config'
import type { RemoteDataset, SchemaConfig } from '../types/app'
import { supabase } from './supabase'
import type { GenSchema, Row } from './quizGenerator'

const SCHEMA_ROW_ID = 1

export interface RemoteDatasetOptions {
  /** Table des lignes, sans préfixe d'appli (`elements` → `periodic_elements`). */
  rows: string
  /** Colonne clé = colonne sujet du CSV (`element`) : sert à cibler une ligne, non modifiable ici. */
  key: string
  /** Mêmes colonnes/ordre que les en-têtes du CSV embarqué : la table en est un miroir éditable. */
  columns: string[]
  /** Table singleton (id = 1) des réglages partagés du panneau de génération. */
  schema: string
}

/** Version en base du jeu de données embarqué : lecture publique, écriture réservée aux admins
 *  (policies RLS côté Supabase), pour corriger une donnée sans redéployer l'appli. */
export function createRemoteDataset(options: RemoteDatasetOptions): RemoteDataset {
  return {
    async fetchRows() {
      const { data, error } = await supabase
        .from(table(options.rows))
        .select(options.columns.join(','))
        .order('row_order', { ascending: true })
      if (error || !data?.length) return null
      return data as unknown as Row[]
    },

    async fetchSchemaConfig() {
      const { data, error } = await supabase
        .from(table(options.schema))
        .select('noun,title,columns')
        .eq('id', SCHEMA_ROW_ID)
        .maybeSingle()
      if (error || !data) return null
      return { noun: data.noun, title: data.title, columns: data.columns ?? {} }
    },

    // Un refus RLS ne remonte pas d'erreur PostgREST (juste 0 ligne affectée) : on le détecte via
    // `.select()` pour ne jamais rapporter un succès silencieusement faux.
    async saveSchemaConfig(schema) {
      const config = toSchemaConfig(schema)
      const { data, error } = await supabase
        .from(table(options.schema))
        .update({ noun: config.noun, title: config.title, columns: config.columns, updated_at: new Date().toISOString() })
        .eq('id', SCHEMA_ROW_ID)
        .select('id')
      if (error) throw error
      if (!data?.length) throw new Error('Mise à jour refusée (droits insuffisants).')
    },

    async updateRow(key, patch) {
      const { data, error } = await supabase.from(table(options.rows)).update(patch).eq(options.key, key).select(options.key)
      if (error) throw error
      if (!data?.length) throw new Error('Mise à jour refusée (droits insuffisants ou ligne introuvable).')
    },
  }
}

/** Complète un schéma auto-inféré avec les réglages partagés (nom/titre, include/séparateur par
 *  colonne) — les colonnes absentes de `config.columns` gardent leurs valeurs inférées.
 *  Volontairement sans `subjectColumn` : c'est la clé des traductions, formes et fiches. */
export function applySchemaConfig(inferred: GenSchema, config: SchemaConfig | null): GenSchema {
  if (!config) return inferred
  const columns: GenSchema['columns'] = { ...inferred.columns }
  for (const [col, override] of Object.entries(config.columns)) {
    if (!columns[col]) continue
    columns[col] = { ...columns[col], ...override }
  }
  return { ...inferred, noun: config.noun || inferred.noun, title: config.title || inferred.title, columns }
}

/** Extrait d'un GenSchema la config partageable (l'inverse d'`applySchemaConfig`). */
export function toSchemaConfig(schema: GenSchema): SchemaConfig {
  const columns: SchemaConfig['columns'] = {}
  for (const [col, spec] of Object.entries(schema.columns)) columns[col] = { include: spec.include, multivalueSeparator: spec.multivalueSeparator }
  return { noun: schema.noun, title: schema.title, columns }
}
