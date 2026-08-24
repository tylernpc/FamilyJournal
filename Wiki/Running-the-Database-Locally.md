# Running the Database Locally

The local database runs as a **SQL Server 2022 container** via Docker Compose. The API runs on your host and connects to it over port `1433`. Data persists in a named Docker volume, so it survives container restarts.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [.NET 10 SDK](https://dotnet.microsoft.com/download) installed
- Repo cloned (see [New Developer Setup](/New-Developer-Setup))

## Configure environment

1. From the repo root, copy the example env file:

   ```
   cp .env.example .env
   ```

2. Open `.env` and set `MSSQL_SA_PASSWORD` to a strong password. SQL Server requires **8+ characters with upper, lower, digit, and symbol**.
3. Ensure the password inside `ConnectionStrings__DefaultConnection` **exactly matches** `MSSQL_SA_PASSWORD` — the API authenticates with it.

> `.env` is gitignored — never commit real values.

## Start the database

From the repo root:

1. Start the container in the background:

   ```
   docker compose up -d
   ```

2. Confirm it's healthy (wait until `STATUS` shows `healthy`):

   ```
   docker compose ps
   ```

## Run the API

1. From the project folder:

   ```
   cd Backend/FamilyJournalApi
   dotnet run
   ```

2. On startup the API loads `.env`, then DbUp creates the database and applies the migration scripts automatically.
3. The API is now available at `http://localhost:5092` (HTTPS: `https://localhost:7150`). In Development, the OpenAPI doc is at `/openapi/v1.json`.

## Stopping and resetting

| Action | Command |
|---|---|
| Stop the container (keeps data) | `docker compose down` |
| Stop **and wipe** the database | `docker compose down -v` |
| Tail SQL Server logs | `docker compose logs -f sqlserver` |

## Troubleshooting

- **Login failed for user 'sa'** — the connection-string password doesn't match `MSSQL_SA_PASSWORD`, or you changed the password after the volume was created. Run `docker compose down -v` and start again.
- **Port 1433 already in use** — another SQL Server (local install or container) is running. Stop it, or change the host port mapping in `docker-compose.yml`.
- **Container stuck unhealthy** — check `docker compose logs sqlserver`; a weak `MSSQL_SA_PASSWORD` will cause the server to exit on startup.
