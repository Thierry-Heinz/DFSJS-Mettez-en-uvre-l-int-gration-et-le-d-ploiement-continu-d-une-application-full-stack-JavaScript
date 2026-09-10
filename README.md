# Orion CRM

A simplified Customer Relationship Management (CRM) application built with the MERN stack (modernized with TypeScript, Vite, and Prisma), industrialized with a full CI/CD pipeline (GitHub Actions, Docker, SonarQube, Dependabot, Trivy).

## Architecture

This project follows a monorepo structure with separate frontend and backend applications:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express 5 + TypeScript + Prisma

There is no npm workspace at the repository root: dependencies, builds, and test suites for `client/` and `server/` are managed independently, including in the pipeline.

## Prerequisites

- **Node.js** >= 22.0.0
- **npm** >= 10.0.0
- **Docker** and **Docker Compose** (optional, for a containerized run — see below)

## Installation (local, without Docker)

### 1. Clone the repository

```bash
git clone <repository-url>
cd p7-dfsjs
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` if needed (default values should work for local development).

### 4. Initialize the database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Install frontend dependencies

```bash
cd ../client
npm install
```

### 6. Configure frontend environment

```bash
cp .env.example .env
```

## Running the Application

### Start the backend server

```bash
cd server
npm run dev
```

The API will be available at `http://localhost:8080`

### Start the frontend application

In a new terminal:

```bash
cd client
npm run dev
```

The application will be available at `http://localhost:4200`



## Running with Docker

The application can also be run fully containerized, without installing Node.js or npm locally. Each app (`client`, `server`) has its own multi-stage `Dockerfile`, orchestrated by a single `docker-compose.yml` at the repository root.

```bash
docker compose up -d --build     # build the images and start both services
docker compose ps                # both services should report "healthy"
docker compose down              # stop the stack, data is kept
docker compose down -v           # stop the stack and reset the database (drops the volume)
```

The application is then available at `http://localhost:4200` (the `client` service, served by nginx, proxies `/api` to the `server` service). Database migrations are applied automatically when the backend container starts — no manual command needed.

The database is SQLite, persisted through a named Docker volume (`orion-data`). The `server` service is not exposed on the host; nginx is the only entry point, which reduces the attack surface. The database starts empty; data created through the UI survives a stop/restart of the stack.

## CI/CD Pipeline

The pipeline runs on GitHub Actions and is split into three workflows:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push on `main`, `feat/**`, `fix/**`; every pull request; manual dispatch | Installs dependencies, generates the Prisma client, builds both apps, runs the test suites and produces coverage reports, then sends everything to SonarQube Cloud for analysis |
| `release.yml` | Push of a `v*.*.*` tag | Re-runs the full CI as a prerequisite, then builds and publishes the `server` and `client` Docker images to GitHub Container Registry (GHCR), and creates a GitHub Release with generated release notes and build artifacts attached |
| `security.yml` | Nightly (03:00 UTC) + manual dispatch | Scans both Docker images with Trivy and publishes the results (SARIF) to the repository's Security tab |

`ci.yml` has three jobs: `server` and `client` run in parallel, and `sonar` runs once both have finished (it needs their coverage reports).

**Branch protection**: `main` is protected — direct pushes are disabled by a GitHub ruleset. All changes go through a pull request, and required status checks (the CI jobs above) must pass before a merge is allowed. The `push` trigger on `main` in `ci.yml` therefore only ever fires as a result of a merge, never a manual push.

## Releasing a New Version

Versioning is manual SemVer — the only human action is creating and pushing a tag; everything else (build, publish, release notes) is automated:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Published images are private on GHCR by default — make them public from the package settings if needed.

## Code Quality & Security

Security is handled at three complementary levels:

| Level | What is analyzed | Tool | When |
|---|---|---|---|
| Code | Vulnerabilities, bad practices, complexity | SonarQube Cloud | On every pull request |
| Dependencies | npm packages, GitHub Actions, base images | Dependabot | Weekly, plus on every published advisory |
| Image contents | System packages, installed libraries, sensitive files | Trivy | Every night |

- The SonarQube Cloud quality gate is **informative**, not blocking — it does not fail the `sonar` job or block a merge on its own. The tests and compilation checks are the actual blocking gates.
- Dependabot covers three ecosystems (`npm`, `docker`, `github-actions`) and opens pull requests automatically. Every Dependabot PR triggers the same CI as any other PR; it still requires a manual review and merge — there is no auto-merge configured. Dependabot PRs don't have access to repository secrets (`if: github.actor != 'dependabot[bot]'` guards the steps that need them).
- Trivy scans both published images nightly and reports findings without blocking the pipeline.

## Monitoring (ELK stack, optional)

An Elasticsearch/Logstash/Kibana stack for log observability lives on the `feat/elk` branch and is **not** merged into `main` — it stays a local/optional add-on, deployed separately from the main pipeline via its own compose file:

```bash
docker compose -f docker-compose-elk.yml up -d
```

Backend logs are shipped via Winston/HTTP, frontend (nginx) logs via syslog — both indexed into Elasticsearch and visualized in a 5-panel Kibana dashboard (request volume, error rate, response time, for both apps). A helper script can generate realistic test traffic to populate the dashboards:

```bash
./generate-traffic.sh
```

## Backup & Restore

The SQLite database file is the only stateful data to protect (configuration files and build artifacts are already versioned in git / published as release artifacts).

```bash
./scripts/backup.sh                              # copies orion.db out of the running container into ./backups/, timestamped
./scripts/restore.sh backups/orion-<timestamp>.db # stops the server, restores the file, restarts the server
```

Recommended frequency: weekly. Both scripts are triggered manually today — a good next step is scheduling `backup.sh` (e.g. via cron) rather than relying on someone remembering to run it.

## Available Scripts

### Backend (server/)

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

### Frontend (client/)

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run lint` - Lint code

## Project Structure

```
p7-dfsjs-starter/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client services
│   │   ├── types/         # TypeScript type definitions
│   │   ├── App.tsx        # Main App component
│   │   └── main.tsx       # Application entry point
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── server/                # Backend Express application
│   ├── src/
│   │   ├── controllers/   # Route handlers (HTTP layer)
│   │   ├── services/      # Business logic layer
│   │   ├── repositories/  # Data access layer
│   │   ├── models/        # Data models and schemas
│   │   ├── routes/        # API route definitions
│   │   └── index.ts       # Server entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── logstash/               # Logstash pipeline config (feat/elk branch only)
├── scripts/
│   ├── backup.sh
│   └── restore.sh
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── security.yml
├── docker-compose.yml
├── docker-compose-elk.yml  # feat/elk branch only
├── generate-traffic.sh
└── README.md
```

## Features

- **Dashboard**: View statistics and overview
- **Contacts Management**: Create, read, update, and delete contacts
- **Organizations Management**: Manage companies and link them to contacts
- **RESTful API**: Well-structured backend with Controller-Service-Repository pattern
- **Type Safety**: Full TypeScript support on frontend and backend
- **Modern UI**: Tailwind CSS with responsive design

## API Endpoints

### Organizations

- `GET /api/organizations` - Get all organizations
- `GET /api/organizations/:id` - Get organization by ID
- `POST /api/organizations` - Create new organization
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization
- `GET /api/organizations/stats` - Get organization statistics

### Contacts

- `GET /api/contacts` - Get all contacts
- `GET /api/contacts/:id` - Get contact by ID
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/contacts/stats` - Get contact statistics

## Technology Stack

### Frontend

- **React 19**: Modern React with Hooks
- **TypeScript 5.x**: Static typing
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **TanStack Query**: Data fetching and caching
- **Axios**: HTTP client
- **React Router**: Client-side routing
- **Zustand**: Lightweight state management

### Backend

- **Node.js**: JavaScript runtime
- **Express 5**: Web framework
- **TypeScript 5.x**: Static typing
- **Prisma**: Modern ORM
- **SQLite**: Database (dev and prod)
- **Zod**: Runtime type validation
- **Vitest**: Testing framework

### CI/CD & Operations

- **GitHub Actions**: CI/CD pipeline (build, test, release, nightly security scan)
- **Docker** (multi-stage builds) + **Docker Compose**: Containerization and orchestration
- **GitHub Container Registry**: Docker image hosting
- **SonarQube Cloud**: Static analysis and code quality
- **Dependabot**: Dependency, Docker image, and GitHub Actions version updates
- **Trivy**: Container image vulnerability scanning
- **Elasticsearch / Logstash / Kibana**: Log observability (optional, `feat/elk` branch)

## Development Guidelines

### Code Style

- Use **TypeScript strict mode**
- No `any` types allowed
- Use **functional components** and hooks (no class components)
- Use `async/await` for asynchronous operations (no callbacks)
- Follow the **Controller-Service-Repository** pattern on the backend

### Architecture Principles

- **Separation of Concerns**: Clear separation between UI, business logic, and data access
- **Type Safety**: Define interfaces/types for all data structures
- **Custom Hooks**: Extract complex logic into reusable hooks
- **API Layer**: Centralized API calls in service files
- **Validation**: Use Zod schemas for input validation

## License

MIT
