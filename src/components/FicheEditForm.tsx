import { useState } from 'react'
import type { FormEvent } from 'react'
import type { GenSchema, Row } from '../utils/quizGenerator'
import { useT } from '../i18n'

interface FicheEditFormProps {
  row: Row
  schema: GenSchema
  /** Enregistre les champs modifiés de la ligne `key` (valeur canonique du sujet). */
  save: (key: string, patch: Partial<Row>) => Promise<void>
  onSaved: (updatedRow: Row) => void
  onCancel: () => void
}

/** Formulaire d'édition admin d'une ligne du jeu de données : un champ texte par colonne
 *  incluse, sauf le sujet et l'article — renommer un sujet sortirait du périmètre (traductions,
 *  formes et vues restent indexées par le nom exact). Valeurs brutes (non traduites) :
 *  ce sont elles qui sont stockées en base, indépendamment de la langue d'affichage. */
export function FicheEditForm({ row, schema, save, onSaved, onCancel }: FicheEditFormProps) {
  const t = useT()
  const { subjectColumn, articleColumn, columns } = schema
  const editableCols = Object.entries(columns).filter(([c, s]) => s.include && c !== subjectColumn && c !== articleColumn)
  const [values, setValues] = useState<Row>(() => Object.fromEntries(editableCols.map(([c]) => [c, row[c] ?? ''])))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (col: string, value: string) => setValues((previous) => ({ ...previous, [col]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const canonical = row[subjectColumn] ?? ''
      await save(canonical, values)
      onSaved({ ...row, ...values })
    } catch {
      setError(t('fiche.editError'))
    } finally {
      setSaving(false)
    }
  }

  return <form className="fiche-edit-form" onSubmit={submit}>
    {editableCols.map(([col, spec]) => (
      <label key={col}>
        {spec.label}
        <input value={values[col] ?? ''} onChange={(event) => setField(col, event.target.value)} />
      </label>
    ))}
    {error && <p className="alert" role="alert">{error}</p>}
    <div className="fiche-edit-actions">
      <button type="button" className="secondary" onClick={onCancel} disabled={saving}>{t('common.cancel')}</button>
      <button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
    </div>
  </form>
}
