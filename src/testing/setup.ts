import { configureEngine } from '../config'

// Config neutre pour les tests du moteur : ils vérifient le mécanisme (préfixes appliqués), pas une
// appli en particulier. À déclarer dans `setupFiles` du vitest de l'appli hôte.
export const TEST_CONFIG = { appId: 'test-app', tablePrefix: 'test', appName: 'Test App' }

configureEngine(TEST_CONFIG)
