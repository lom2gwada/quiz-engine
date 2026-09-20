import type { Question } from '../types/quiz'

const loading = new Map<string, Promise<void>>()
/** Au-delà, on lance quand même la question : une image qui n'arrive pas ne doit pas bloquer la partie. */
const MAX_WAIT_MS = 5000

function loadImage(url: string): Promise<void> {
  let promise = loading.get(url)
  if (!promise) {
    promise = new Promise<void>((resolve) => {
      if (typeof Image === 'undefined') { resolve(); return }
      const image = new Image()
      image.onload = () => resolve()
      image.onerror = () => resolve()
      image.src = url
    })
    loading.set(url, promise)
  }
  return promise
}

/** Charge (dans le cache du navigateur) les images des réponses d'une question ; se résout quand elles sont prêtes,
 *  en erreur ou après `MAX_WAIT_MS`. Sans image de réponse : résolue tout de suite. */
export function preloadAnswerImages(question: Question | undefined): Promise<void> {
  if (!question || question.type !== 'qcm') return Promise.resolve()
  const urls = question.content.answers.flatMap((answer) => (answer.imageUrl ? [answer.imageUrl] : []))
  if (!urls.length) return Promise.resolve()
  return Promise.race([
    Promise.all(urls.map(loadImage)).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, MAX_WAIT_MS)),
  ])
}
