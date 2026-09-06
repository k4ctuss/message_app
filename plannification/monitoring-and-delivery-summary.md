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
- BDD : SQLite (rapide, zéro dépendance, adapté à l'itération).
- Tests : **unitaires** uniquement (mocks, pas de vraie BDD, `npm test`).
- Monitoring : aucun.

### 3.2 Dev — environnement éphémère, durée de vie = durée du job CI
- Déclencheur : push/PR vers `dev`.
- Durée de vie : **uniquement le temps du job CI** — `terraform apply` → déploiement → tests d'intégration → `terraform destroy`, tout dans le même job. Pas de persistance entre deux runs. Pas d'accès manuel prévu : si un ingénieur a besoin d'explorer/débugger, il checkout la branche et lance l'app en local.
- Infra : petite VM ou conteneur, provisionnée par Terraform (workspace/état identifié par le run CI, détruit systématiquement à la fin du job — succès ou échec).
- BDD : Postgres conteneurisé, taille réduite, jetable.
- Tests : **tests d'intégration** — vraies requêtes HTTP contre l'API réellement déployée, vraie BDD (pas de mock), exécutés automatiquement pendant le job.
- Accès manuel : aucun — développement local à la place.
- Monitoring : aucun (juste les logs du job CI).
- Hébergement : AWS (même provider/module que prod ; le coût en heures reste négligeable puisque l'environnement ne vit que quelques minutes par run).
- Point de vigilance à documenter dans le rapport : s'assurer que le `terraform destroy` s'exécute **même si les tests échouent** (step `if: always()` dans le workflow), pour ne jamais laisser de ressource orpheline.

### 3.3 Staging — permanent, infra identique à la prod
- Déclencheur de déploiement : merge/PR sur `main`.
- Durée de vie : permanente.
- Infra : **strictement le même module Terraform que la prod**, juste une variable d'environnement différente (même taille de VM, mêmes conteneurs).
- BDD : Postgres conteneurisé, données anonymisées/synthétiques.
- Tests : **E2E complets (Cypress)** — parcours utilisateur réels contre l'app déployée, écriture/lecture réelle en base, nettoyage des données de test à la fin (fixtures/teardown).
- Accès manuel : SSH tunnel permanent (`ssh -L 8080:localhost:80 ...`), **pas d'exposition publique du port 80/443** — security group Terraform n'ouvre que le port 22.
- Monitoring : léger (juste `/health`, pas la stack complète).
- Hébergement : **[À trancher]** — Azure (B1S, dans le quota gratuit puisque c'est le seul VM sur ce compte) ou Oracle Cloud Always Free (VM ARM, gratuit sans limite de durée). Les deux évitent de cumuler avec le quota AWS déjà utilisé par prod+dev.

### 3.4 Prod — permanente
- Déclencheur : release/tag.
- Durée de vie : permanente, 24/7.
- Infra : 1 VM AWS (EC2 t2/t3.micro, reste sous les 750h/mois gratuites puisque c'est la seule instance permanente sur ce compte).
- BDD : Postgres conteneurisé, données réelles.
- Tests post-déploiement : **tests de fumée** uniquement — non-destructifs (`/health`, vérifier que les pages clés répondent). Jamais de test qui écrit en prod.
- Accès manuel : HTTP public (80/443, TLS) + SSH restreint pour l'admin.
- Monitoring : **complet** — Prometheus + Grafana + (Alertmanager + node-exporter + cAdvisor), tous sur la même VM que l'app (docker-compose).
- Hébergement : AWS.

### 3.5 Tableau récapitulatif

| | Local | Dev | Staging | Prod |
|---|---|---|---|---|
| Déclencheur | commit | push/PR → `dev` | PR/merge → `main` | release/tag |
| Durée de vie | permanent (poste) | éphémère (durée du job CI) | permanent | permanent |
| BDD | SQLite | Postgres (conteneur, réduite, jetable) | Postgres (conteneur, anonymisée) | Postgres (conteneur, réelle) |
| Tests | unitaires | intégration | E2E (Cypress) + nettoyage | fumée (post-déploiement) |
| Accès manuel | local | aucun (checkout + run local si besoin) | SSH tunnel permanent | HTTP public + SSH admin |
| Monitoring | aucun | aucun | léger (`/health`) | complet (Prometheus/Grafana/Alertmanager) |
| Provider | — | AWS (éphémère) | Azure ou Oracle **[à trancher]** | AWS |

## 4. Pipelines GitHub Actions

- **`ci.yml`** — sur toute PR, quel que soit la branche cible : lint, tests unitaires, SonarQube, `npm audit`/secret scanning, build des images Docker. Indépendant de tout déploiement.
- **`cd-dev.yml`** — sur push/PR vers `dev` : `terraform apply` → déploiement → tests d'intégration → `terraform destroy` (systématique, y compris en cas d'échec des tests), tout dans le même job.
- **`cd-staging.yml`** — sur merge/PR vers `main` : déploiement sur la VM staging persistante → tests E2E Cypress → nettoyage des données de test.
- **`cd-prod.yml`** — sur tag/release, avec **approbation manuelle** (environment protection rule GitHub) : build/push image → mise à jour de la stack sur la VM prod → tests de fumée.

## 5. Infrastructure as Code (Terraform)

- Un module Terraform réutilisable : VM, security group, réseau — variabilisé par environnement (`dev`, `staging`, `prod`).
- **State backend** : S3 + verrouillage DynamoDB (AWS), ou solution équivalente si un second provider est utilisé pour staging.
- **Sécurité d'accès** :
  - Prod : security group ouvert en 80/443 (public) + 22 restreint (admin).
  - Staging/Dev : security group **fermé en 80/443**, seul le port 22 est ouvert — accès uniquement via tunnel SSH.
- **Authentification GitHub Actions → AWS** : via **OIDC** (rôle IAM assumé temporairement), pas de clés d'accès statiques stockées en secret. Argument de sécurité fort pour le rapport.

## 6. Base de données

- Sequelize permet de changer de dialecte sans réécrire la logique métier — argument clé pour justifier la différenciation d'environnements dans le rapport.
- **Local** : SQLite (fichier, rapide, zéro dépendance).
- **Dev/Staging/Prod** : PostgreSQL conteneurisé (pas de RDS, pour éviter un second quota free tier à gérer en parallèle de l'EC2).

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

## 12. Points encore ouverts

- [ ] Provider d'hébergement pour staging (Azure vs Oracle Cloud Always Free).
- [ ] Détail exact du contenu de la review de PR assistée par IA (simple documentation vs automatisation réelle).
- [ ] Rédaction de la description de PR à soumettre aux profs pour validation du plan.