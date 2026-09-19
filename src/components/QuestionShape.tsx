import { useT } from '../i18n'

/** Silhouette d'un territoire (contour) : SVG inline généré au build (src/data/shapes.ts, contenu de
 * confiance). Recoloré par `currentColor` via `.question-shape` dans styles.css → suit le thème. */
export function QuestionShape({ svg, alt, className }: { svg: string; alt?: string; className?: string }) {
  const t = useT()
  return (
    <div
      className={className ? `question-shape ${className}` : 'question-shape'}
      role="img"
      aria-label={alt ?? t('shape.defaultAlt')}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
