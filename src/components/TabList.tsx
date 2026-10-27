import { useRef, type KeyboardEvent } from 'react'

export interface TabItem<Id extends string> {
  id: Id
  label: string
}

/** Position atteinte par une touche du clavier dans une liste d'onglets : flèches (avec retour au début / à la fin),
 *  Début et Fin. `null` pour toute autre touche. */
export function nextTabIndex(current: number, count: number, key: string): number | null {
  if (count <= 0) return null
  if (key === 'ArrowRight' || key === 'ArrowDown') return (current + 1) % count
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (current - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

/** Identifiants à relier au panneau affiché : `<div role="tabpanel" id={tabPanelId(prefix)} aria-labelledby={tabId(prefix, value)}>`. */
export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`
export const tabPanelId = (prefix: string) => `${prefix}-panel`

/** Onglets accessibles : `role="tablist"`, un seul arrêt de tabulation, flèches / Début / Fin pour changer (l'onglet
 *  choisi est celui qui a le focus). Le panneau correspondant est rendu par l'appelant. */
export function TabList<Id extends string>({ tabs, value, onChange, label, idPrefix }: { tabs: TabItem<Id>[]; value: Id; onChange: (id: Id) => void; label: string; idPrefix: string }) {
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (event: KeyboardEvent) => {
    const next = nextTabIndex(tabs.findIndex((tab) => tab.id === value), tabs.length, event.key)
    if (next === null) return
    event.preventDefault()
    onChange(tabs[next].id)
    buttons.current[tabs[next].id]?.focus()
  }

  return <div className="tab-list" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
    {tabs.map((tab) => <button
      key={tab.id}
      ref={(element) => { buttons.current[tab.id] = element }}
      id={tabId(idPrefix, tab.id)}
      type="button"
      role="tab"
      aria-selected={tab.id === value}
      aria-controls={tabPanelId(idPrefix)}
      tabIndex={tab.id === value ? 0 : -1}
      className={tab.id === value ? 'tab-option active' : 'tab-option'}
      onClick={() => onChange(tab.id)}
    >{tab.label}</button>)}
  </div>
}
