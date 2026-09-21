# Plan du projet DevOps — App de groupes/messages (React/Express/SQLite→Postgres)

> Document de travail — synthétise les décisions prises jusqu'ici. Les points marqués **[À trancher]** restent ouverts.

## 1. Contexte et objectif

Projet de cours existant (React front, Express back, base de données via Sequelize), initialement doté d'un pipeline GitLab CI basique. Objectif : construire une démarche DevOps complète et cohérente autour de cette app volontairement simple, pour couvrir en profondeur tous les critères du projet plutôt que de viser une infrastructure surdimensionnée.

Migration en cours : remote GitLab → GitHub effectuée, la CI GitLab n'a pas encore été portée en GitHub Actions.

## 2. Mapping avec la grille de critères

| Critère | Comment il est couvert |
|---|---|
| CI (build + tests automatisés) | GitHub Actions : lint, tests unitaires, build Docker, SonarQube |
| CD (déploiement automatisé) | GitHub Actions + Terraform, déploiement différencié par environnement |
| Infrastructure as Code | Terraform (VM, réseau/security groups, backend S3) |
| Plateforme de dev moderne | GitHub, branch protection, review obligatoire, CODEOWNERS |
| Qualité / sécurité | SonarQube (analyse statique) + Dependabot + secret scanning + `npm audit` |
| Usage documenté de l'IA | `AI_USAGE.md` + éventuelle review de PR automatisée par IA |
| Repo fonctionnel | Ce repo, avec toute la config/doc nécessaire |
| Rapport (2-3 pages) | Architecture, justification des choix, interactions, limites |

## 3. Les environnements

### 3.1 Local
- Déclencheur : à chaque commit/modification sur le poste du développeur.
- Durée de vie : permanente (poste de travail).
- Infra : `docker-compose.yml` avec uniquement le service **Postgres** (port mappé sur `localhost:5432`) ; backend et frontend tournent nativement via `npm run dev` (nodemon/vite) pour garder un hot-reload rapide sans reconstruire d'image à chaque sauvegarde.
- BDD : **Postgres**, comme partout ailleurs — élimine tout risque de bug qui n'apparaîtrait qu'en dev/staging/prod à cause d'un comportement SQLite différent (contraintes, types...). La suite de tests unitaires, elle, n'a besoin d'aucune BDD (tout est mocké par définition d'un test unitaire).
- Tests : **unitaires** uniquement (mocks, pas de vraie BDD, `npm test`).
- Monitoring : aucun.

### 3.2 Dev — étape de validation, pas un environnement (durée de vie = durée du job CI)
- Déclencheur : push/PR vers `dev`.
- Ce n'est pas un environnement au sens propre : rien n'est déployé nulle part, rien n'est accessible. C'est une étape de validation automatisée qui monte des conteneurs jetables dans le runner, teste, puis disparaît avec lui.
- Durée de vie : **uniquement le temps du job CI**. Pas d'accès manuel prévu : si un ingénieur a besoin d'explorer/débugger, il checkout la branche et lance l'app en local.
- Infra : **aucune infra cloud** — `docker compose up` (backend + Postgres) directement dans le runner GitHub Actions. Chaque run est un runner isolé et jetable par nature : zéro risque de collision entre PR simultanées, rien à détruire explicitement, pas de Terraform impliqué pour cet environnement (le critère IaC reste couvert par staging/prod).
- BDD : Postgres conteneurisé, reconstruite à zéro à chaque run — `sequelize db:migrate` puis `sequelize db:seed:all` avec un **jeu de données fixe et versionné dans le repo** (pas un snapshot de staging : garantit des tests déterministes et reproductibles).
- Tests : **tests d'intégration** — vraies requêtes HTTP contre l'API réellement déployée, vraie BDD (pas de mock), exécutés automatiquement pendant le job.
- Accès manuel : aucun — développement local à la place.
- Monitoring : aucun (juste les logs du job CI).
- Hébergement : aucun (tout tourne dans le runner GitHub Actions, jamais sur le cloud).

### 3.3 Staging — permanent, infra identique à la prod
- Déclencheur de déploiement : merge/PR sur `main`.
- Durée de vie : permanente.
- Infra : **strictement le même module Terraform que la prod**, juste une variable d'environnement différente (même taille de VM, mêmes conteneurs).
- BDD : RDS Postgres (managé), données anonymisées/synthétiques.
- Tests : **E2E complets (Cypress)**, en deux temps — (1) **avant merge**, contre une stack complète lancée via `docker compose up` **directement dans le runner CI**, jamais sur l'infra cloud (aucun risque de collision entre PR simultanées, et rien n'est déployé sur staging avant que ces tests ne passent). BDD reconstruite à zéro avec le même jeu de données fixe versionné que pour dev — volontairement **pas** un snapshot de staging, pour garder des tests déterministes et reproductibles. (2) **après merge**, une fois le déploiement réel effectué sur la VM staging, une confirmation E2E est rejouée contre le **vrai RDS staging** (données anonymisées réelles) pour valider l'environnement (réseau, secrets, config cloud) — en cas d'échec, **rollback automatique** vers le tag précédent (trivial grâce au pattern build-once).
- Accès manuel : SSH tunnel permanent (`ssh -L 8080:localhost:80 ...`), **pas d'exposition publique du port 80/443** — security group Terraform n'ouvre que le port 22.
- Monitoring : léger (juste `/health`, pas la stack complète).
- Hébergement : AWS (EC2 + RDS). Le crédit de 200$ AWS disponible couvre largement les trois environnements sans avoir besoin de jongler entre providers.

### 3.4 Prod — permanente
- Déclencheur : release/tag.
- Durée de vie : permanente, 24/7.
- Infra : 1 VM AWS (EC2 t2/t3.micro, reste sous les 750h/mois gratuites puisque c'est la seule instance permanente sur ce compte).
- BDD : RDS Postgres (managé), données réelles.
- Tests post-déploiement : **tests de fumée** uniquement — non-destructifs et en lecture seule (`GET /health`, `GET /` du frontend, une route de lecture simple comme `GET /api/groups`), quelques secondes, pas de navigateur nécessaire (simples requêtes HTTP avec assertions). Aucune donnée écrite → aucun nettoyage requis, contrairement aux E2E.
- **Déploiement sans coupure (blue-green)** : la nouvelle version (`green`) démarre à côté de l'ancienne (`blue`, qui continue de servir le trafic), toutes deux connectées à la même RDS. Une fois `green` health-checkée, nginx bascule son `upstream` de `blue` vers `green` et fait un `nginx -s reload` (gracieux — termine les requêtes en cours sur `blue`, route les nouvelles vers `green`, sans coupure perceptible). `blue` n'est arrêtée qu'une fois `green` confirmée stable par les tests de fumée. En cas d'échec, **rollback quasi instantané** : `blue` n'a jamais été arrêtée, il suffit de refaire pointer nginx vers elle.
- Implication sur les migrations : pendant la fenêtre où `blue` et `green` tournent en parallèle sur la même base, le schéma doit être compatible avec les deux versions du code — d'où l'importance du pattern expand/contract même sur une fenêtre courte (voir section 13).
- Accès manuel : HTTP public (80/443, TLS) + SSH restreint pour l'admin.
- Monitoring : **complet** — Prometheus + Grafana + Alertmanager + node-exporter + cAdvisor, tous sur la même VM que l'app (docker-compose).
- Hébergement : AWS.

### 3.5 Tableau récapitulatif

| | Local | Dev | Staging | Prod |
|---|---|---|---|---|
| Déclencheur | commit | push/PR → `dev` | PR/merge → `main` | release/tag |
| Durée de vie | permanent (poste) | éphémère (durée du job CI) | permanent | permanent |
| BDD | Postgres (local, natif+docker) | Postgres (conteneur, jetable) | RDS Postgres (managé) | RDS Postgres (managé) |
| Tests | unitaires | intégration | E2E (Cypress) + nettoyage | fumée (post-déploiement) |
| Accès manuel | local | aucun (checkout + run local si besoin) | SSH tunnel permanent | HTTP public + SSH admin |
| Monitoring | aucun | aucun | léger (`/health`) | complet (Prometheus/Grafana/Alertmanager) |
| Provider | — | aucun (runner CI) | AWS | AWS |

## 4. Pipelines GitHub Actions

- **`ci.yml`** — sur toute PR, quel que soit la branche cible : lint, tests unitaires, SonarQube, `npm audit`/secret scanning, build des images Docker. Indépendant de tout déploiement.
- **`cd-dev.yml`** — sur push/PR vers `dev` : `docker compose up` (backend + Postgres) directement dans le runner, tests d'intégration, aucune infra cloud provisionnée.
- **`cd-staging.yml`** — sur merge/PR vers `main` : déploiement sur la VM staging persistante → tests E2E Cypress → nettoyage des données de test.
- **`cd-prod.yml`** — sur tag/release, avec **approbation manuelle** (environment protection rule GitHub) : build/push image → mise à jour de la stack sur la VM prod → tests de fumée.

### Règles GitHub  configurer

**Branch protection sur `main`** : PR obligatoire (pas de push direct), status checks requis (`ci.yml` + job E2E pré-merge), branche à jour avant merge, conversations résolues, historique linéaire (squash/rebase), pas de force-push/suppression, règles appliquées aux admins. Review obligatoire si plusieurs contributeurs (sinon documenter le choix solo).

**Branch protection sur `dev`** : même logique allégée — PR + `ci.yml`/job d'intégration comme status checks requis, pas de gate E2E.

**GitHub Environments** : un environnement `production` avec reviewer requis, c'est ce qui implémente concrètement l'approbation manuelle avant déploiement prévue dans `cd-prod.yml`.

**Tag protection** : protéger les tags `v*` contre suppression/écrasement, cohérent avec le principe d'immutabilité des releases.

Principe explicite à documenter dans le rapport : l'image Docker est construite **une seule fois** au moment du merge vers `main`, taguée (SHA du commit ou semver), poussée vers un registre (GHCR). Elle est déployée telle quelle sur staging via `docker compose pull` + `up -d`. Au moment de la release, **on ne rebuild rien** : on promeut la même image, déjà validée sur staging, vers la VM prod. Ce qui tourne en prod est donc bit-à-bit ce qui a été testé, jamais un nouveau build à partir du même code source.

## 5. Infrastructure as Code (Terraform)

- Un module Terraform réutilisable : VM, security group, réseau — variabilisé par environnement (`dev`, `staging`, `prod`).
- **State backend** : S3 + verrouillage DynamoDB (AWS), ou solution équivalente si un second provider est utilisé pour staging.
- **Sécurité d'accès** :
  - Prod : security group ouvert en 80/443 (public) + 22 restreint (admin).
  - Staging/Dev : security group **fermé en 80/443**, seul le port 22 est ouvert — accès uniquement via tunnel SSH.
- **Authentification GitHub Actions → AWS** : via **OIDC** (rôle IAM assumé temporairement), pas de clés d'accès statiques stockées en secret. Argument de sécurité fort pour le rapport.

## 6. Base de données

- **Postgres partout** (local, dev, staging, prod) — garantit une parité totale entre environnements, élimine tout risque de bug spécifique à un dialecte SQL qui n'apparaîtrait que dans certains environnements.
- **Local** : conteneur Postgres via docker-compose (backend/frontend tournent nativement pour le hot-reload).
- **Dev (runner CI)** : Postgres conteneurisé, jetable — inutile de provisionner un service managé pour un test qui dure quelques minutes.
- **Staging/Prod** : **AWS RDS Postgres** (managé), provisionné par Terraform. Découple le cycle de vie de la BDD de celui de l'app (redéployer l'EC2 ne touche jamais RDS), sauvegardes et patching gérés par AWS. Rendu possible sans souci de quota grâce au crédit AWS (voir section hébergement).

### Migrations entre versions

Le conteneur de BDD n'est pas reconstruit à chaque déploiement — seule l'image de l'app change. Les données vivent dans un **volume Docker** découplé du cycle de vie du conteneur, donc recréer/mettre à jour le conteneur Postgres ne touche pas aux données. Le schéma évolue via des **migrations versionnées Sequelize** (`sequelize-cli migration:generate` / `db:migrate`), suivies dans une table `SequelizeMeta` pour garantir qu'une migration n'est appliquée qu'une seule fois. La migration s'exécute comme une étape explicite du pipeline de déploiement (ex. `docker compose run --rm backend npx sequelize-cli db:migrate`) avant ou juste après le redémarrage de l'app.

Limite à documenter dans le rapport : pour un déploiement parfaitement sans coupure, une migration devrait rester compatible avec l'ancienne version de l'app pendant la fenêtre de redémarrage (ex. ne pas supprimer une colonne encore utilisée) — risque faible ici vu la taille du projet, mais bon réflexe à mentionner.

## 7. Qualité et sécurité

- **SonarQube** : instance gratuite fournie par l'école, intégrée en étape de la CI.
- **Dependabot/Renovate** : bot de mise à jour des dépendances.
- **Secret scanning** : natif GitHub ou gitleaks en CI.
- **`npm audit`** : vérification des vulnérabilités connues, en CI.

## 8. Usage documenté de l'IA

- Fichier `AI_USAGE.md` à la racine du repo : documente précisément où et comment Claude a été utilisé (conception de l'architecture, debug, génération de configuration Terraform/GitHub Actions, etc.).
- Piste à explorer : brancher une **review de PR automatisée par IA** (GitHub Action appelant l'API Claude pour commenter les PR) — démonstration concrète plutôt qu'une simple mention documentaire.

## 9. Monitoring (prod uniquement, complet)

Métriques suivies : disponibilité backend/frontend, latence des routes clés, erreurs HTTP/exceptions, disponibilité BDD, volume d'activité métier (connexions, groupes créés, messages envoyés), ressources système (CPU/mémoire/disque).

Alertes prioritaires : backend indisponible, taux de 5xx élevé, latence excessive sur routes clés, BDD inaccessible, déconnexions WebSocket anormales.

Stack : `morgan` (déjà en place) → endpoint `/health` → métriques Prometheus sur `/metrics` → dashboards Grafana → alertes Alertmanager.

## 10. Rapport (2-3 pages)

Structure prévue :
1. Architecture générale (schéma des environnements + pipeline).
2. Justification des choix techniques (environnements éphémère vs permanent, choix des providers, SQLite→Postgres, OIDC, séparation staging/prod).
3. Interactions entre composants (CI → CD → environnements → monitoring).
4. Limites et trade-offs assumés : dépassement éventuel de quota, absence de VPN (SSH tunnel comme compromis), portée volontairement limitée de l'infra.

## 11. Ressources de référence

- [MERN app CI/CD pipeline avec dev/staging/prod + monitoring](https://github.com/ptavaressilva/MERN_app_CI-CD_pipeline) — projet très proche en stack et en structure.
- [Ephemeral preview containers (AWS + Terraform + GitHub Actions)](https://github.com/aws-samples/ephemeral-preview-containers-furl) — pattern d'environnement éphémère par PR.
- [PoC environnement de test éphémère par PR](https://github.com/whatsfordinner/github-actions-testing)
- [Comparatif des free tiers cloud](https://github.com/cloudcommunity/Cloud-Free-Tier-Comparison) — à citer dans le rapport pour justifier le choix des providers.
- [Playlist DevOps Crash Course (Docker, Terraform, GitHub Actions)](https://www.classcentral.com/classroom/youtube-devops-crash-course-docker-terraform-and-github-actions-109153)

## 13. Décisions sur les zones de flou

- **TLS/HTTPS** : hors scope, assumé explicitement comme limite dans le rapport (pas de nom de domaine/certificat prévu pour ce projet).
- **Secrets** : AWS SSM Parameter Store en priorité (gratuit, intégrable via Terraform) ; repli sur `.env` (gitignoré) + GitHub Actions Secrets si le temps manque.
- **Alerting (Alertmanager → Discord/Slack/email)** : stretch goal, pas bloquant pour la validation du projet.
- **Rollback** : sur prod, quasi instantané grâce au déploiement blue-green (bascule nginx vers l'ancien conteneur encore actif, voir section 3.4) ; sur staging, rollback applicatif classique (redéploiement du tag précédent, pattern build-once) en cas d'échec de la confirmation E2E. Rollback de schéma BDD dans les deux cas : atténué par des migrations additives/rétrocompatibles (pattern expand/contract), mais pas résolu à 100 % — documenté comme limite assumée plutôt que traité en profondeur, vu l'échelle du projet.
- **Concurrence sur staging** : résolue par le découpage de la validation E2E en deux temps (voir section 3.3) — plus de risque de collision entre PR concurrentes.
- **Usage de l'IA** : ambiguïté du critère assumée en couvrant les deux lectures possibles — (1) un vrai step de code-review automatisé par IA dans la CI, (2) documentation continue dans `AI_USAGE.md` (alimenté au fil de l'eau, pas reconstitué a posteriori).

## 14. Points encore ouverts

- [ ] Détail exact du contenu de la review de PR assistée par IA (simple documentation vs automatisation réelle).
- [ ] Passer le repo en public (plus tard, pas immédiatement) pour débloquer "Required reviewers" sur l'environnement `production` — indisponible sur repo privé en dehors de GitHub Enterprise. En attendant, gate manuel via `workflow_dispatch` sur `cd-prod.yml`.
