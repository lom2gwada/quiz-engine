import type { Theme } from '../types/profile'

/** Applique le thème au document (les variables CSS sont définies dans styles.css). */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}
