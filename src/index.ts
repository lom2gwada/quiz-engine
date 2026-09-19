// Point d'entrée public du moteur : ce qu'une application importe (`@engine`).
export { configureEngine } from './config'
export type { EngineConfig } from './config'
export { AuthGate } from './components/AuthGate'
export { parseCsv, inferSchema, generateQuiz, randomSeed } from './utils/quizGenerator'
export type { GenSchema, Row, ColumnSpec } from './utils/quizGenerator'
export { createRemoteDataset, applySchemaConfig, toSchemaConfig } from './utils/remoteDataset'
export { HoverPreview } from './components/HoverPreview'
export { QuestionShape } from './components/QuestionShape'
export { useT, useLocale } from './i18n'
export { makeDatasetI18n } from './i18n/dataset'
export type { DataI18n } from './i18n/data'
export type { Locale } from './i18n/locale'
export type {
  Dataset, DatasetView, DatasetViewContext, FicheDecor, FicheDecorator, QuizAppSpec, RemoteDataset, SchemaConfig,
} from './types/app'
