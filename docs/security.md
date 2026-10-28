# Sécurité des données (Supabase) — audit des règles RLS

Audit du 28/10/2026 du projet Supabase partagé par Oliver Quiz, Quiz Caraïbes (`quiz_forge_*`) et Periodic Quiz (`periodic_*`), mené en lecture seule
(advisors Supabase, `pg_policies`, `pg_constraint`, privilèges). Les correctifs sont dans [`hardening.sql`](hardening.sql), à exécuter dans l'éditeur SQL.

La clé publique (`anon`) est dans le JavaScript des applis : **toute la sécurité repose sur les règles RLS, les contraintes et les fonctions** ci-dessous.

## 1. Ce qui est en place

| Critère | Résultat |
|---|---|
| RLS activé partout | **27 tables sur 27** (`relrowsecurity`), toutes avec des règles sauf `periodic_admins` et `quiz_forge_admins` (aucune règle = personne n'y accède, lues par `is_*_admin()`) |
| Historique et profil privés | Oui : lecture / écriture limitées à `auth.uid() = user_id` (ou `= id` pour les profils) sur `*_quiz_results`, `*_question_results`, `*_profiles`, `*_badges`, `*_daily_results`, `*_guest_passes` |
| Aucune écriture sans identité | Aucune règle d'écriture n'est ouverte à `anon` sans condition `auth.uid()` ou admin |
| Défi du jour : une tentative par jour | **Contrainte en base** : clé primaire `(user_id, day)` ; l'insertion exige `day = aujourd'hui (UTC)` et `finished_at IS NULL` ; la mise à jour n'est possible que tant que `finished_at IS NULL` (une seule fin de tentative) |
| Données de référence | `*_dataset`, `*_schema`, `periodic_elements` : lecture publique, écriture réservée aux administrateurs (`is_*_admin()`) |
| Classements | Vues `*_leaderboard_*` (une ligne par joueur), jointes aux profils pour pseudo et avatar : `SECURITY DEFINER` **volontairement** (lire pseudo / avatar au-delà de la règle « mon profil seulement ») |

## 2. Constats et correctifs proposés

| # | Gravité | Constat | Correctif (`hardening.sql`) |
|---|---|---|---|
| 1 | **Haute** | **Aucune borne sur les scores d'historique** : un joueur connecté peut insérer (ou modifier, voir 2) une partie `score = 100`, `elapsed_seconds = 0`, `question_count = 1000` et entrer ainsi au classement, car les vues lisent `*_quiz_results`. Aucune contrainte `CHECK` n'existe | Contraintes `CHECK` de plausibilité (score 0–100, points ≤ total, bonnes réponses ≤ questions, au moins une demi-seconde par question, date non future). Les 176 lignes existantes les respectent |
| 2 | **Haute** | **Un joueur peut modifier ses propres résultats** après coup (règles `UPDATE` sur `*_quiz_results` et `*_question_results`) : un score honnête devient un faux score | Supprimer ces règles `UPDATE` (partie 2). Le moteur envoie désormais ses lignes avec « ignorer les doublons », qui ne demande que le droit d'insertion |
| 3 | **Haute** | **Score du défi du jour fixé par le client** : la mise à jour de fin de tentative accepte n'importe quelles valeurs (`correct_count = 9999`, `elapsed_seconds = 0`) | Fonction `finish_<appli>_daily` (`SECURITY DEFINER`) : jour du jour, ≤ 20 questions, bonnes réponses ≤ jouées, série ≤ bonnes réponses, durée ≥ ½ s par question et ≤ temps réel écoulé depuis la réservation + 10 s ; puis suppression de la règle `UPDATE` directe. Le moteur appelle la fonction (repli sur l'ancien chemin tant qu'elle n'existe pas) |
| 4 | Moyenne | **Le rôle `anon` a tous les privilèges de table** (INSERT / UPDATE / DELETE / TRUNCATE…) sur les tables et même sur certaines vues : réglage par défaut de Supabase, aujourd'hui neutralisé par RLS (et inexploitable via l'API REST pour TRUNCATE), mais un seul oubli de règle ouvrirait l'écriture | Retirer les privilèges d'écriture à `anon` (garde SELECT), et `TRUNCATE`, `REFERENCES`, `TRIGGER` à `authenticated` |
| 5 | Moyenne | **Mots de passe compromis acceptés** (protection HaveIBeenPwned désactivée dans Auth) | Réglage du tableau de bord : Authentication → Providers → Email → « Leaked password protection » |
| 6 | Basse | `handle_new_user()` (déclencheur de création de profil) est exécutable via l'API par `anon` et `authenticated` | `REVOKE EXECUTE` pour ces rôles (le déclencheur continue de fonctionner) |
| 7 | Info | 14 vues `SECURITY DEFINER` signalées en ERREUR par le linter : ce sont les classements, voulus (voir §1) | Aucune action ; alternative : `security_invoker` + règle de lecture publique de `pseudo` / `avatar` si on veut faire taire le linter |
| 8 | Info | Fonctions `SECURITY DEFINER` exécutables par `anon` : `check_*_guest_pass`, `fetch_guest_quiz`, `submit_guest_result` (liens invités) : voulu. `submit_guest_result` borne déjà le score (0–100), la taille et le nom | Aucune action |

## 3. Ce que cela ne résout pas

Le score reste **calculé par le navigateur** : les bornes ci-dessus arrêtent les valeurs impossibles, pas un joueur qui ment dans les limites du plausible (par
exemple 18 bonnes réponses sur 20 en 60 s). Seul un calcul côté serveur (la page ne reçoit que les réponses, la base corrige) fermerait la porte ; il demande que
le serveur connaisse les questions (jeu de données + graine), donc un vrai back-end ou une Edge Function — hors périmètre de ce ticket.

## 4. Vérifier

```sql
-- RLS partout
select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and relkind = 'r' order by 1;
-- Règles
select tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' order by 1, 3;
-- Privilèges d'anon sur les tables
select table_name, string_agg(privilege_type, ',') from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon' group by 1;
```

Et le linter : Supabase → Advisors → Security (ou l'outil `get_advisors`).
