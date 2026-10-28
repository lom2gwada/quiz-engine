import type { DataInfo } from '../types/app'
import { useLocale, useT } from '../i18n'

/** « Données mises à jour le 27 octobre 2026. Sources : … » — une seule date pour l'ensemble des données, et la liste des sources. */
export function DataInfoNote({ info, className }: { info?: DataInfo; className?: string }) {
  const t = useT()
  const locale = useLocale()
  if (!info) return null
  const date = new Date(`${info.updatedAt}T12:00:00Z`)
  const shown = Number.isNaN(date.getTime()) ? info.updatedAt : date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return <p className={className ? `data-info ${className}` : 'data-info'}>
    {t('dataInfo.updated', { date: shown })}
    {info.sources && info.sources.length > 0 && <> {t('dataInfo.sources')} {info.sources.map((source, index) => <span key={source.label}>
      {index > 0 && ', '}
      {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : source.label}
    </span>)}.</>}
  </p>
}
