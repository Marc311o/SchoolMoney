# SchoolMoney

Web app for managing school class fundraisers. Parents register, add children and join classes
with access codes; treasurers run fundraisers with virtual accounts, payments, withdrawals and
invoices, generate financial reports and chat with parents. Includes an admin panel.

**Stack:** FastAPI · PostgreSQL · React (Vite + TypeScript) · Docker

---

## Table of contents
- [Requirements](#requirements)
- [Setup](#setup)
- [Commands](#commands)
- [Project structure](#project-structure)
- [Git workflow](#git-workflow)

---
## Requirements

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose
- [just](https://github.com/casey/just) – `winget install Casey.Just`, `brew install just` or `pip install rust-just`

---

## Setup

```git
git clone <repo-url>
cd SchoolMoney
cp .env.example .env    # default values work out of the box
just hooks              # enable the pre-commit hook (once per clone)
just up                 # build and start everything
```

| Service  | URL                               |
|----------|-----------------------------------|
| Frontend | http://localhost:5173             |
| API docs | http://localhost:8000/docs        |
| pgAdmin  | http://localhost:5050 (`just tools`) |

### pgAdmin

1. Log in with `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` from `.env`
2. host `db`, port `5432`, user and password from `.env`.
3. From a database tool on your own machine (pgAdmin, DataGrip) use host `localhost` instead.

---

## Commands

Run `just` to list all recipes. Most common ones:

| Command      | What it does                                        |
|--------------|-----------------------------------------------------|
| `just up`    | Build and start the stack with logs in the terminal |
| `just tools` | Start the stack together with pgAdmin               |
| `just down`  | Stops containers                                    |
| `just test`  | Backend tests (pytest)                              |

---

## Project structure

```githubexpressionlanguage
SchoolMoney
├───.githooks	            # pre-commit hook
├───.github                 # PR / issue templates, CI
├───backend                 
│ 	 └app               # FastAPI application
│	 └tests             # pytest
├───docs
├───frontend    
│ 	 └src               # React application
├───docker-compose.yaml     
└───justfile                # just commands
```

---

## Git workflow

- `main` – stable version
- `develop` – integration branch and the default one.

1. Pick an issue from the current sprint and assign yourself.
2. Create a branch from an up-to-date `develop`.
3. After commiting open a PR to `develop`
4. Merge after 1 approval and green CI.

At the end of a sprint `develop` is merged into `main` and tagged (`v0.1`, `v0.2`, …).


### Before you push

The pre-commit hook runs `just format` and `just lint` on every commit. If it stops a commit:

- *"Code was formatted automatically"* – review the changes, `git add`, commit again.
- Lint error – fix it by hand; the hook cannot fix everything.

CI runs the same checks plus tests and the frontend build on every PR.