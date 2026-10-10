---

title: Messaging App  
author:

- Blanc Nolan

---

## Installation

Dev mode (docker compose needed):
First create your .env files both in backend and frontend directories, you can use the .env.example files as a template.
To launch the backend and frontend in dev mode, you can use the following command in the project directory:

```sh
  npm run dev
```

This command creates or restarts a Docker container for the PostgreSQL database, and then launches the backend and frontend in development mode. The backend is available at http://localhost:3000/api, the frontend at http://localhost:5173, and the API documentation at http://localhost:3000/doc. The backend restarts automatically when its code changes, and the frontend reloads automatically when its code changes.

> [!TIP] If you want to seed or reset the database, you can call the command with the following environment variables:
>
> ```sh
>  DB_SEED=true npm run dev # to seed the database
>  DB_RESET=true DB_SEED=true npm run dev # to reset and seed the database
> ```

## Local production mode

The local production mode builds the production Docker image and starts both
Compose profiles: `db` for PostgreSQL and `app` for the application.

The application must use the Compose service name `db` in `DATABASE_URL`, not
`localhost`, because the application runs inside its own container.

```sh

export DATABASE_URL=postgresql://postgres:test@db:5432/messaging
export PORT=3000
export TOKENSECRET=local-development-secret

docker compose --profile db --profile app build
docker compose --profile db --profile app up -d
```

The application is available at http://localhost:3000. To stop the local
production stack:

```sh
docker compose --profile db --profile app down
```

## Production on AWS

Production and staging are defined with Terraform under `infra/envs`. Each
environment creates its own EC2 instance, RDS PostgreSQL database, security
groups, IAM role, and instance profile.

The EC2 bootstrap script installs Docker, Nginx, AWS CLI, and `jq`. It selects
the environment-specific Nginx configuration and writes it as
`/etc/nginx/conf.d/app.conf`.

The EC2 instance uses its IAM role to access ECR, Secrets Manager, and SSM
Parameter Store. Database credentials are read from the RDS-managed secret.
The JWT secret is read from the environment-specific SSM parameter. Neither
secret is stored in GitHub Actions or passed as a command-line argument.

Production uses a blue-green deployment. The new image is started on the
inactive port, migrations and the `/health` endpoint are checked, and Nginx
is switched to the new container. The previous container is removed only
after the switch succeeds.

Staging uses a simpler deployment. The new image is pulled, migrations are
executed, the previous container is stopped, and the new container listens on
port `3000` behind Nginx.

Images are built once in the staging workflow and tagged with the commit SHA.
Production deploys the exact same immutable image identified by that SHA; it
does not rebuild the image.

## Code Architecture

### Front-End

```
frontend
|-- components.json
|-- cypress
|   |-- e2e
|   |   `-- connection.cy.js
|   |-- fixtures
|   `-- support
|-- cypress.config.js
|-- eslint.config.js
|-- index.html
|-- jsconfig.json
|-- package.json
|-- public
|-- README.md
|-- src
|   |-- App.css
|   |-- App.jsx
|   |-- assets
|   |   |-- hero.png
|   |   |-- react.svg
|   |   `-- vite.svg
|   |-- components
|   |   |-- auth
|   |   |-- group
|   |   |-- message
|   |   `-- ui
|   |-- contexts
|   |   |-- AuthContext.jsx
|   |   `-- SocketContext.jsx
|   |-- hooks
|   |   |-- useDiscussion.js
|   |   |-- useGroups.js
|   |   `-- useManageGroup.js
|   |-- index.css
|   |-- lib
|   |   `-- utils.js
|   |-- main.jsx
|   `-- views
|       |-- Accueil.jsx
|       `-- Connection.jsx
`-- vite.config.js
```

### Back-End

```plantuml
class User{
  name
  email
  passhash
  isAdmin : boolean
}

class Message{
  content
}

class Group{
  name
}

User "1" -- "n" Message : posts
Group "1" -- "n" Message : contains

User "n" -- "n"  Group : is member
User "1" -- "n"  Group : create and own
```

```
backend
|-- config
|   `-- config.js
|-- jest.config.js
|-- jest.setup.js
|-- migrations/       # folder containing the migration files for the database
|-- seeders/          # folder containing the seed files for the database
|-- package.json
|-- setup-test.sh     # script to setup the test database before running the tests
`-- src
    |-- __tests__     # folder containing the unit and integration tests
    |-- app.js        # entry point of the express app
    |-- controllers   # folder containing the controllers for the different endpoints
    |   |-- group.js
    |   |-- message.js
    |   `-- user.js
    |-- frontend
    |   `-- index.html
    |-- models        # folder containing the models for the database tables
    |   |-- database.js
    |   |-- groups.js
    |   |-- messages.js
    |   `-- users.js
    |-- routes        # folder containing the routes for the different endpoints
    |   |-- connection.js
    |   |-- group.js
    |   |-- message.js
    |   |-- protected.js
    |   `-- user.js
    |-- server.js   # entry point of the backend server
    |-- util        # folder containing utility functions for the backend
    |   |-- CodeError.js
    |   |-- logger.js
    |   |-- swagger.js
    |   `-- updatedb.js
    `-- websocket
        `-- websocket.js  # folder containing all websocket functions
```

### infra

```
infra
├── envs                # folder containing the different environments for the infrastructure
│   ├── prod          
│   │   ├── main.tf     
│   │   ├── outputs.tf
│   │   ├── provider.tf
│   │   └── variables.tf
│   ├── shared          # shared is used to set up the shared resources between staging and prod (like the ECR repository) buckets, OICD, etc...
│   │   ├── main.tf
│   │   ├── oicd.tf
│   │   └── provider.tf
│   └── staging
│       ├── main.tf
│       ├── outputs.tf
│       ├── provider.tf
│       └── variables.tf
└── modules           # contains the different modules for the infrastructure called by the different environments
    └── app-stack
        ├── database.tf         # contains the RDS database module
        ├── ec2.tf              # contains the EC2 instance module
        ├── iam.tf              # contains the IAM roles and policies used by the EC2 instance 
        ├── main.tf
        ├── outputs.tf          # contains the outputs of the module
        ├── scripts
        │   └── setup_ec2.sh.tftpl  # install package and set up nginx
        ├── security-groups.tf  # Security groups with egress and ingress rules
        └── variables.tf

```

## Tests

### Backend

Backend tests use Jest and Supertest. They exercise the HTTP API, including
authentication, users, groups, and messages, against a test database. The
backend test command also prepares the test database before running the tests.

### Frontend

Frontend unit tests use Vitest and React Testing Library to test components,
hooks, and isolated UI behaviour.

Frontend integration tests use Vitest to test interactions between frontend
parts and their contexts or application services.

End-to-end tests use Cypress. They run the frontend, backend, and PostgreSQL
database together and test complete user workflows through the browser.

## Git hooks

The `pre-commit` hook runs `lint-staged`. It formats staged JavaScript files
with Prettier and applies ESLint fixes to the staged backend and frontend
files.

The `pre-push` hook runs frontend unit tests and the complete backend Jest test
suite. A push is blocked if either test command fails.

## GitHub Actions workflows

- `ci.yml` runs linting, frontend unit tests, dependency audits, Gitleaks
  secret scanning, and the Docker image build on pull requests.
- `ci-dev.yml` runs backend and frontend integration tests for pull requests
  targeting `develop`.
- `e2e-pr.yml` builds the application image, starts PostgreSQL, runs database
  migrations and seeds, then runs Cypress end-to-end tests for pull requests
  targeting `main`.
- `infra-staging.yml` runs Checkov and Terraform format, validation, and plan
  checks for infrastructure pull requests targeting `main`.
- `cd-staging.yml` applies staging infrastructure, builds and pushes the
  immutable image, then deploys it to EC2 through SSM and run cypress e2e tests.
- `cd-prod.yml` is manually triggered with a Git tag. It plans and applies the
  production infrastructure, then deploys the corresponding immutable image
  to EC2 through SSM using blue-green deployment.
