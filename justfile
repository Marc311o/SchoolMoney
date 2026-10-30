# To install just:
# Windows: `winget install Casey.Just`
# Any other where python is available: `pip install rust-just`

set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

# shows command list
default:
    @just --list

# ==================================================
# ENV
# ==================================================

# builds project with logs
[group('env')]
up:
    docker compose up --build -V

# builds project without logs (in the background)
[group('env')]
up-d:
    docker compose up --build -d --wait -V

# builds project with pgadmin
[group('env')]
tools:
    docker compose --profile tools up --build -d -V

# stops project
[group('env')]
down:
    docker compose --profile tools down

# restarts container
[group('env')]
restart service:
    docker compose restart {{service}}

# rebuilds containers
[group('env')]
rebuild:
    docker compose up --build --renew-anon-volumes -d

# logs
[group('env')]
logs service="":
    docker compose logs -f {{service}}

# one-time setup after cloning
[group('env')]
hooks:
    git config core.hooksPath .githooks

# ==================================================
# CODE QUALITY
# ==================================================

# Lint (Ruff + oxlint) check
[group('quality')]
lint:
    docker compose exec -T backend ruff check .
    docker compose exec -T backend ruff format --check .
    docker compose exec -T frontend npm run lint

# Lint (Ruff + Prettier) fix
[group('quality')]
format:
    docker compose exec -T backend ruff check . --fix
    docker compose exec -T backend ruff format .
    docker compose exec -T frontend npm run format

# backend tests
[group('quality')]
test *args:
    docker compose exec -T backend pytest {{args}}


# ==================================================
# DATABASE
# ==================================================

# psql shell in the main database
[group('db')]
psql:
    docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

# psql shell in the test database
[group('db')]
psql-test:
    docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "${POSTGRES_DB}_test"'

# start pgAdmin
[group('db')]
pgadmin:
    docker compose --profile tools up -d pgadmin

# wipe the database and start fresh
[group('db')]
[confirm("This action will clear ALL the data from the database. Continue?")]
db-reset:
    docker compose --profile tools down -v
    docker compose up --build -d --wait -V

# apply all migrations
[group('db')]
migrate:
    docker compose exec -T backend alembic upgrade head

# creates new migration
[group('db')]
makemigration message:
    docker compose exec -T backend alembic revision --autogenerate -m "{{message}}"

# Undo migration
[group('db')]
[confirm("Undo newest migration?")]
downgrade:
     docker compose exec -T backend alembic downgrade -1

# show the current migration
[group('db')]
migrate-status:
    docker compose exec -T backend alembic current


# fill the database with test data (`just seed --help` for options)
[group('db')]
seed *args:
    docker compose exec -T backend python -m app.scripts.seed {{args}}
