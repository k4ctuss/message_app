# todo

- [x] update README.md with installation instructions : launch backend setup the first time and then use npm run dev in project directory to launch backend and frontend in dev mode
- [ ] migrate CI pipeline to GitHub Actions
- [x] add Gitleaks secret scanning to CI
- [x] Ajouter Vitest + React Testing Library pour les tests unitaires frontend.
- [x] create unit tests for backend and frontend. those shoudl be run in ci and locally with pre-commit hook.
- [ ] imporve backend integration tests to cover all endpoints and error cases.
- [x] fill the dockerfile with step to build and run the backend and frontend in prod mode for deployment. The dockerfile should be used in ci to build the docker image and run the tests in a containerized environment.
- [x] supprimer le mock des endpoint des test E2E, normalment un tets E2E devrait tester le backend et le frontend en meme temps, donc il ne faut pas mocker les endpoint du backend. on peut garder le mock pour des test unitaire du frontend sur des composants isolés, mais pas pour les test E2E.
- [ ] set up le ssm sur aws avec le db url et creer les databases sur RDS. Permissions au niveau du rôle Postgres : le compte utilisé par l'app en prod ne devrait avoir que SELECT/INSERT/UPDATE/DELETE, jamais de droits DROP/TRUNCATE/ALTER.
- [ ] definir le plan pour le monitoring de la prod avec prometheus et grafana ( docker ou composant de aws ) implmenter /metric avec metrics a scrape et donc definir les metrics et les mesurer sur les endpoints de l'api, les et voir alerte si le temps le permet
- [ ] Ajouter un healthcheck PostgreSQL dans docker-compose.yml.
- [x] ajouter un .env.example avec les variables d'environnement necessaires pour lancer le projet en dev en local. (DB_NAME, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, PORT, TOKENSECRET) les DB_* doivent etre les memes que dans le docker-compose.yml pour que le projet fonctionne en dev en local avec docker-compose up.

```json
{
    "scripts": {
        "test:unit": "jest --config jest.unit.config.js",
        "test:integration": "./setup-test.sh && DB_NAME=messaging_test jest --config jest.integration.config.js",
        "test": "npm run test:unit && npm run test:integration"
    }
}
```