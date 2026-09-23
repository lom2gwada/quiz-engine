import { useEffect } from 'react'
import { useT } from '../i18n'
import { playVictory } from '../utils/sound'

/** Bilan « record personnel » générique (classique / contre-la-montre / sans-faute) : équivalent du
 *  bilan spécifique du blitz (`BlitzSummary`), pour les 3 autres modes. `value`/`previousBest` sont déjà
 *  mis en forme avec leur unité par l'appelant (`82 %`, `17 bonnes réponses`…), qui diffère par mode.
 *  `previousBest` : `undefined` = rien à afficher (blitz, ou comparaison non pertinente), `null` = première
 *  partie de ce mode sur ce quiz. */
export interface RecordSummaryData {
  value: string
  previousBest?: string | null
  isRecord: boolean
  isTie: boolean
}

export function RecordSummary({ data }: { data: RecordSummaryData }) {
  const t = useT()
  useEffect(() => { if (data.isRecord) playVictory() }, [data.isRecord])
  if (data.previousBest === undefined) return null
  const line = data.previousBest === null
    ? t('record.first', { value: data.value })
    : data.isRecord
      ? t('record.new', { value: data.value, prev: data.previousBest })
      : data.isTie
        ? t('record.tie', { value: data.value })
        : t('record.behind', { value: data.value, prev: data.previousBest })
  return <p className={data.isRecord ? 'blitz-summary-record is-record' : 'blitz-summary-record'}>{line}</p>
}
