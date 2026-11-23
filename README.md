# SchoolMoney

SchoolMoney is a web app for managing school class fundraisers. Parents can register, manage their children's class memberships, and pay contributions from a virtual wallet. Class treasurers run fundraisers, track expenses, upload invoices, and prepare reports. Administrators oversee accounts and fundraisers across the application.

Built for the **Web Application Design** course, 2026/27, with FastAPI, PostgreSQL, React, TypeScript, Vite, and Docker Compose. Wallet and fundraiser transactions are simulated in PLN.

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Setup](#setup)
- [Commands](#commands)
- [Project structure](#project-structure)
- [Git workflow](#git-workflow)
- [Demo walkthrough](#demo-walkthrough)
- [Integration notes](#integration-notes)

## Features

| Role | Main workflows |
| --- | --- |
| **Parent** | Register and activate an account by email. Add, edit, or remove child profiles, request class membership with an access code, and view class fundraisers. Pay for eligible children and review wallet transactions and child reports. |
| **Class treasurer** | Create a class, generate access codes, send email invitations, and approve or reject membership requests. Create and edit fundraisers, withdraw or redeposit funds, attach invoices, and export class and fundraiser reports. |
| **Administrator** | Review, block, or unblock parent accounts and fundraisers. View system totals, export a system-wide report, and contact class treasurers. |

The parent who creates a class becomes its treasurer. A parent can manage children in different classes. Each child can have one current class membership or pending request at a time.

### Fundraisers, reporting, and chat

- Each fundraiser has its own virtual IBAN, a date range, and a fixed amount per child. A parent can pay for their own child or for another eligible child in the class. Payment records show who paid, for whom, and when.
- Treasurers can record spending and upload invoices for class members. Closing a fundraiser returns available funds to the original payers, up to their payment amounts.
- Reports cover individual children, classes, fundraisers, and the system as a whole. CSV and PDF exports are available in English and Polish.
- Chat supports class conversations, direct parent-to-parent messages, and treasurer-to-administrator conversations. It includes unread counts and read receipts. WebSockets provide live updates, with periodic HTTP refreshes as a fallback.

### Parent dashboard

The updated dashboard brings the wallet balance and IBAN, child profiles and class status, open fundraisers, and recent conversations into one view. The cards use existing routes and show data from the application.

| Dashboard section | Destination |
| --- | --- |
| Wallet balance | `/account` |
| Your children | `/children` |
| Classes, Chat, Report, and Settings shortcuts | `/classes`, `/chat`, `/reports`, `/settings` |
| Open fundraiser | `/fundraisers/:fundraiserId` |
| Recent conversation | `/chat/:chatId` |

## Requirements

- Docker with Docker Compose. [Install Docker](https://docs.docker.com/get-docker/)
- `just` for the project's development commands. [Install just](https://github.com/casey/just)

| Installation method | Command |
| --- | --- |
| Windows Package Manager | `winget install Casey.Just` |
| Homebrew | `brew install just` |
| pip | `pip install rust-just` |

## Setup

Start Docker, then run the following commands with your repository's clone URL. The values in `.env.example` are intended for local development. Run `just hooks` once per clone.

```bash
git clone "<repository-url>" SchoolMoney
cd SchoolMoney
cp .env.example .env
just hooks
just up
```

| Service | Local address |
| --- | --- |
| Frontend | [http://localhost:5173](http://localhost:5173) |
| Interactive API docs | [http://localhost:8000/docs](http://localhost:8000/docs) |
| pgAdmin | [http://localhost:5050](http://localhost:5050) when started with `just tools` |

Use `GET /api/health` on port 8000 to check whether the API can reach PostgreSQL. The frontend calls `/api` on its own origin, including the chat WebSocket at `/api/chats/ws`.

### Connect pgAdmin to PostgreSQL

1. Run `just tools` and sign in to pgAdmin with the `PGADMIN_EMAIL` and `PGADMIN_PASSWORD` values from `.env`.
2. Register a server using the following connection settings.

   | Field | Value |
   | --- | --- |
   | Host name or address | `db` |
   | Port | `5432` |
   | Maintenance database | `POSTGRES_DB` from `.env` |
   | Username | `POSTGRES_USER` from `.env` |
   | Password | `POSTGRES_PASSWORD` from `.env` |

3. For a database client running directly on your machine, use `localhost` and the database port published by Docker Compose.

## Commands

Run `just` to list the available recipes.

| Command | Purpose |
| --- | --- |
| `just up` | Build and start the stack with logs in the terminal |
| `just tools` | Start the stack with pgAdmin |
| `just down` | Stop the stack |
| `just hooks` | Enable the local pre-commit hook |
| `just format` | Format project code |
| `just lint` | Run the project's lint checks |
| `just test` | Run the backend test suite with pytest |

## Project structure

| Path | Purpose |
| --- | --- |
| `.githooks/` | Shared pre-commit hook |
| `.github/` | Pull request and issue templates, plus CI configuration |
| `backend/app/` | Modular FastAPI application and API entry point |
| `backend/tests/` | Backend tests |
| `docs/` | Project documentation |
| `frontend/src/` | React application, feature modules, and routes |
| `docker-compose.yaml` | Local service definitions |
| `.env.example` | Template for local environment settings |
| `justfile` | Development recipes |

## Git workflow

`develop` is the default integration branch. `main` holds the stable version.

1. Pick an issue from the current sprint and assign it to yourself.
2. Update your local `develop` branch and branch off it for the issue.
3. Commit your changes and open a pull request targeting `develop`.
4. Merge after at least one approval and a successful CI run.

At the end of each sprint, merge `develop` into `main` and tag the release, for example `v0.1` or `v0.2`.

### Before you push

The pre-commit hook runs `just format` and `just lint` on every commit.

- If the formatter changes files, review the edits, stage them with `git add`, and commit again.
- If linting fails, fix the reported issues and retry the commit.

CI runs the same checks, the backend tests, and the frontend build on every pull request.

## Demo walkthrough

1. Sign in as a class treasurer and open **Classes**. Approve a pending join request, then create a fundraiser with a fixed amount per child and a date range that includes today.
2. In another browser profile, sign in as a parent in the class. Open the fundraiser, pay from the virtual wallet, and verify that the payment appears in both the fundraiser and the wallet history.
3. Send a class message from one profile and open it from the other. Check the unread count and the recent conversation preview on the dashboard.
4. As the treasurer, export a fundraiser report and try **Close & refund** to see how the remaining balance is returned. Sign in as an administrator to review the system overview and export a system-wide report.

## Integration notes

### Dashboard and favicon

When updating an earlier frontend checkout, place the dashboard component at `frontend/src/features/dashboard/pages/DashboardPage.tsx`. Put the SchoolMoney SVG in `frontend/public/favicon.svg` and include the following tag in the `<head>` of `frontend/index.html`.

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

### Route fallback and message reads

With the role-aware fallback installed, unknown URLs send guests to `/login` and signed-in users to their role's home page. The parent home is `/` and the administrator home is `/admin/overview`. Login, registration, and account activation have explicit routes.

To test the first-message read update, open a conversation with one unread message. In the browser's Network tab, look for `POST /api/chats/{id}/read` with status `204`. A later `GET /api/chats` should report `unread_count: 0` for the same conversation if no new messages have arrived.

### Child profile retention

When applying the 30-day retention update to an existing database, run `backend/migrations/child_retention_30_days.sql` before starting the updated backend. During the 30-day window, a parent can restore a removed profile on the same account by re-entering the same first name, last name, and date of birth.

Cleanup runs at startup and then every minute. It removes expired child profiles and class memberships and detaches the child ID from financial records, preserving amounts and refunds for reporting. Its first run includes profiles that already reached the deadline.

### Account activation

The registration form attempts to sign in immediately, so it may show a generic error while activation is pending. Open the link in the activation email, then sign in.
