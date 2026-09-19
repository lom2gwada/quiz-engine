/** Du rouge (0 %) au vert (100 %) en passant par l'ambre — teinte HSL directe, lisible en thème clair comme sombre.
 *  Partagée par les deux heat maps de l'historique pour qu'une même couleur veuille dire la même réussite. */
export const rateColor = (rate: number): string => `hsl(${Math.round(rate * 1.2)} 62% 38%)`
