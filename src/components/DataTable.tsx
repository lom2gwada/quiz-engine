import { useMemo } from 'react'
import type { GenSchema, Row } from '../utils/quizGenerator'
import type { DataI18n } from '../i18n/data'
import { makeDatasetI18n, splitAnnotation } from '../i18n/dataset'
import { getGrammar } from '../i18n/grammar'
import { useLocale, useT } from '../i18n'
import { formatNumericValue } from '../utils/number'
import { CellImagePreview } from './CellImagePreview'

interface DataTableProps {
  rows: Row[]
  schema: GenSchema
  i18n?: DataI18n
}

// Affiche les données source du quiz (le CSV) traduites : en-têtes → libellés lisibles,
// valeurs texte via le sidecar. Lecture seule ; l'édition par l'admin viendra ici.
export function DataTable({ rows, schema, i18n }: DataTableProps) {
  const t = useT()
  const locale = useLocale()
  const data = useMemo(() => makeDatasetI18n(i18n, locale), [i18n, locale])
  const cap = getGrammar(locale).cap
  const headers = rows.length ? Object.keys(rows[0]) : []
  if (!headers.length) return null
  const subject = schema.subjectColumn

  // Colonnes nombre (hors années) : on sépare les milliers à l'affichage.
  const separated = new Set(
    headers.filter((h) => schema.columns[h]?.kind === 'number' && !schema.columns[h]?.isYear),
  )
  const headerLabel = (header: string): string => {
    const label = schema.columns[header]?.label
    return label ? cap(data.label(label)) : header
  }
  const display = (header: string, raw: string): string => {
    const trimmed = raw.trim()
    if (!trimmed) return '—'
    if (separated.has(header) && Number.isFinite(Number(raw))) return formatNumericValue(Number(raw), false, undefined, schema.columns[header]?.unit)
    if (schema.columns[header]?.kind === 'number') return trimmed
    const sep = schema.columns[header]?.multivalueSeparator
    if (sep) return trimmed.split(sep).map((part) => {
      const { name, annotation } = splitAnnotation(part.trim())
      const translated = data.value(name)
      return translated && annotation ? `${translated} ${annotation}` : translated
    }).filter(Boolean).join(', ')
    return data.value(trimmed)
  }

  return (
    <section className="data-table-section">
      <h3 className="stats-group-title">{t('data.title', { rows: rows.length, cols: headers.length })}</h3>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-num" scope="col">#</th>
              {headers.map((header) => (
                <th key={header} scope="col" className={header === subject ? 'sticky-col' : undefined}>{headerLabel(header)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="row-num">{index + 1}</td>
                {headers.map((header) => {
                  const raw = row[header] ?? ''
                  const isImageCell = schema.columns[header]?.isImage && /^https?:\/\//.test(raw)
                  const className = [header === subject ? 'sticky-col' : '', !isImageCell && !raw.trim() ? 'is-empty' : ''].filter(Boolean).join(' ')
                  return (
                    <td key={header} className={className || undefined}>
                      {isImageCell ? <CellImagePreview src={raw.trim()} /> : display(header, raw)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
