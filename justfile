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

# ==================================================
# CODE QUALITY
# ==================================================

# Lint (Ruff + oxlint) check
[group('quality')]
lint:
    docker compose exec backend ruff check .
    docker compose exec backend ruff format --check .
    docker compose exec frontend npm run lint

# Lint (Ruff + Prettier) fix
[group('quality')]
format:
    docker compose exec backend ruff check . --fix
    docker compose exec backend ruff format .
    docker compose exec frontend npm run format

# backend tests
[group('quality')]
test *args:
    docker compose exec backend pytest {{args}}