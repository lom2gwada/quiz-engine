import { useT } from '../i18n'

/** Boutons de fin de partie : sous le score, et répétés sous la liste des corrections. */
export function ResultActions({ onRestartSame, onBackToSettings }: { onRestartSame?: () => void; onBackToSettings: () => void }) {
  const t = useT()
  return <div className="result-actions">
    {onRestartSame && <button type="button" onClick={onRestartSame}>{t('result.restartSame')}</button>}
    <button type="button" className={onRestartSame ? 'secondary' : undefined} onClick={onBackToSettings}>{t('result.backToSettings')}</button>
  </div>
}
