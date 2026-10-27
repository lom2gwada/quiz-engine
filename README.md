# quiz-engine

Moteur partagé de **quiz-caraibes** (ex quiz-forge) et **periodic-quiz** : génération de quiz depuis un CSV, jeu (classique / contre-la-montre / sans-faute), historique, classement, connexion Supabase, liens invités, édition admin, thèmes, i18n (fr / en / es / nl / ht).

Une application = ce dépôt (sous-module git `engine/`) + son propre jeu de données, ses traductions de données et ses vues spécifiques.

## Utilisation dans une appli

```bash
git submodule add https://github.com/lom2gwada/quiz-engine engine
```

- `vite.config.ts` : `test.setupFiles: ['./engine/src/testing/setup.ts']`, `test.include` inclut `engine/src/**`.
- `tsconfig.app.json` : `"include": ["src", "engine/src"]`.
- `src/main.tsx` : `configureEngine({ appId, tablePrefix, appName, messages })`, puis `<AuthGate spec={spec} />` avec un `QuizAppSpec` (CSV embarqué, `buildDataset`, `remote`, `Background`).
- CSS : `import '../engine/src/styles.css'` puis le CSS propre à l'appli.
- Workflow GitHub Pages : `actions/checkout` avec `submodules: true`.

## Ce que le moteur ignore volontairement

Le contenu du jeu de données. Tout ce qui est spécifique passe par `Dataset` (`shapes`, `i18n`, `ficheDecor`, `views`…) ou `EngineConfig.messages`.

## Points d'extension d'un jeu de données

`Dataset` accepte, entre autres : `shapes` (silhouettes), `i18n` (traductions ; `formatValue` met une valeur en forme à l'affichage), `ficheDecor`, `views`,
`categoryGroups`, `subjectFilter`, `boost`, `atlasSort` et :

- **`answerMatchers`** — comparaison de réponse propre à une catégorie. Clé = identifiant de catégorie (nom de colonne), valeur =
  `(given: string, expected: string[]) => boolean`. Pour les questions à saisie (texte, texte à trous) de cette catégorie, elle **remplace** `matchesExpected`
  (casse, accents, espaces, faute de frappe) : à elle de décider ce qui est équivalent — par exemple une configuration électronique
  « [Rn] 5f3 6d1 7s2 » = « [Rn]7s2 5f3 6d1 ». Utilisée au jeu, à la correction, en révision et dans les statistiques. Exemple : `periodic-quiz`, `src/utils/electronConfig.ts`.

## Modifier le moteur

Depuis une appli : éditer `engine/`, y commiter et pousser, puis commiter dans l'appli le nouveau pointeur du sous-module (`git add engine`). Penser à mettre à jour **les deux** applis.
