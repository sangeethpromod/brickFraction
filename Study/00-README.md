# Radisson Fractional: Study Guide (identity foundation)

You will type, by hand, the first slice of the Radisson Fractional backend and frontend: a Go API on Neon Postgres, Better Auth sign-up and login in Next.js, and role-based authorization in Go. Nothing here is copy-and-run. Each lesson tells you what to type, why, and how to check it worked.

> Demo disclaimer: this project is a technical simulation. It moves no real money. See [../docs/00-overview.md](../docs/00-overview.md)....

## 1. Goal and time

**Goal:** by lesson 11 you have a working path: sign up in the browser, get a JWT, call `GET /api/v1/me` on the Go API, see your role, and have a platform admin grant other roles.

**Time:** about 6 to 7 hours in total. Each lesson is under 45 minutes. Do one or two per sitting.

## 2. How to use this guide

1. Do the lessons **in order**. Each one builds on the last.
2. Type the code. Do not paste it. Typing is how Go's syntax and idioms stick.
3. After each lesson, tick the **Checkpoint** before you continue.
4. If something breaks, read **Common errors** first, then compare your file with the lesson, character by character.
5. **Try it yourself** exercises are optional. Skip them on a first pass.
6. Anything marked **Verify against docs** is something I could not confirm for certain. Check the linked docs before relying on it.

All shell commands use **Git Bash** syntax (it comes with Git for Windows). macOS and Linux terminals behave the same. In PowerShell, call `curl.exe`, not `curl`.

## 3. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Go | 1.23 or newer | `go version` |
| Node.js | 20.9 or newer (Next.js requirement; tested on 26) | `node -v` |
| pnpm | 9 or newer | `pnpm -v` (install: `npm i -g pnpm`) |
| Git Bash | any | `bash --version` |
| A Neon project | any plan | you will copy two connection strings in lesson 01 |

You also need an editor with Go support (VS Code with the Go extension is fine) and `curl`.

Versions this guide was built and tested with (November 2026): Go 1.26, chi v5.5, pgx v5.13, goose v3.30, golang-jwt v5.3, keyfunc v3.9, Next.js 16.4, React 19, Better Auth 1.7, kysely 0.29, pg 8.23, Node 26, pnpm 10. Newer minor versions should work; a new major version may change APIs.

## 4. Repo structure (target)

Your repo root is called `Tokenization` on disk; the guide calls it `radisson-fractional/`. Use exactly these folder names.

```text
radisson-fractional/
  docs/                              already exists
  Study/                             this guide
  backend/
    .env.example
    cmd/api/main.go
    migrations/                      goose, domain tables only
    internal/
      app/                           server.go, router.go (mounts all modules)
      config/
      platform/
        db/                          pgx pool
        logger/                      slog setup
        httpx/                       JSON responses, errors
      middleware/                    requestid, logging, cors, auth, roles
      modules/
        identity/                    model.go repository.go service.go controller.go routes.go
  frontend/                          Next.js (App Router, TypeScript, pnpm)
    .env.example
    src/app/
    src/lib/auth.ts  src/lib/auth-client.ts  src/lib/api.ts
```

There is no `docker-compose.yml` and no Mailpit. Postgres is your existing Neon database.

## 5. How the lessons connect

```text
01 repo + env        -> folders, secrets hygiene, Neon connection strings
02 go + config       -> Go module that reads env vars
03 http + healthz    -> first running API (chi, graceful shutdown)
04 db + migrations   -> pgx pool, goose, /healthz/db
05 roles tables      -> roles, user_roles (goose migration)
06 better auth       -> Next.js: sign-up, login, JWT, "auth" schema
07 jwt middleware    -> Go verifies the Better Auth JWT via JWKS
08 identity module   -> controller -> service -> repository, GET /me
09 role middleware   -> RequireRole, admin grants roles
10 frontend -> API   -> browser attaches the token, role-based redirect
11 tests + checklist -> table-driven tests, end-to-end check, recap
```

Two systems, one database, two schemas:

```text
Browser --(cookie)--> Next.js + Better Auth --> Neon, schema "auth"  (users, sessions, jwks)
Browser --(Bearer JWT)--> Go API ---------------> Neon, schema "public" (roles, user_roles)
Go API --(GET /api/auth/jwks, cached)--> Next.js   (to verify the JWT signature)
```

Better Auth **authenticates** (who are you). Go **authorizes** (what may you do). The two share only the user id string.

## 6. Layering rules (enforced from lesson 08)

- `controller -> service -> repository`. Never skip a layer.
- Controllers never touch the database.
- A module talks to another module only through that module's **service interface**, never its repository.
- Each module exposes `Register(r chi.Router, deps)` in `routes.go`. `internal/app/router.go` mounts the modules.

## 7. Decisions already made (do not revisit while learning)

- Postgres on Neon. Go API with chi, pgx, goose, `log/slog`.
- Better Auth is self-managed in the Next.js app (not Neon Auth): email and password only, JWT plugin.
- Go verifies the JWT with the JWKS endpoint and reads the user id from `sub`.
- Roles live in Go tables: `roles`, `user_roles`. Only `platform_admin` assigns roles. A user with no roles becomes `investor` on the first `/me` call.
- Errors are always `{"error": {"code": "...", "message": "..."}}`.

## 8. Heads-up about files that already exist in this repo

- `Backend/` and `Frontend/` already exist with earlier scaffolding built for **Neon Auth**. Windows folder names are case-insensitive, so `backend/` and `Backend/` are the same folder. Lesson 01 shows how to move the old one aside so you start clean.
- `neon.ts` has `auth: true` (Neon Auth). This guide does **not** use Neon Auth. Leave it alone and do not enable it for this flow.
- `docker-compose.yml` is empty and unused.
- [../docs/04-architecture.md](../docs/04-architecture.md) still says "Auth.js" in the stack table. The decision is now Better Auth; update that row when convenient.
- The docs list a sixth role, `valuer`. This guide seeds the five roles you specified. Adding `valuer` later is one new migration.

## 9. Glossary of Go terms used

| Term | Meaning |
|---|---|
| **module** | A Go project, defined by `go.mod`. Ours is `radisson-fractional/backend`. |
| **package** | A folder of `.go` files that share a `package name` line. Imported by path. |
| **internal/** | Packages under it can only be imported from inside the parent module. |
| **struct** | A named group of fields. Go's "class without methods inside". |
| **method** | A function attached to a type: `func (s *Service) Me(...)`. |
| **interface** | A list of method signatures. Any type with those methods satisfies it, with no `implements` keyword. |
| **pointer** (`*T`, `&x`) | A reference to a value. Methods that change state take a pointer receiver. |
| **error** | A built-in interface. Functions return `(value, error)`; you check `err != nil`. |
| **error wrapping** | `fmt.Errorf("doing x: %w", err)` adds context and keeps the original, so `errors.Is` still works. |
| **context.Context** | Carries cancellation, deadlines and request-scoped values through calls. First parameter by convention. |
| **goroutine** | A lightweight concurrent function started with `go f()`. |
| **channel** | A typed pipe between goroutines. |
| **defer** | Runs a call when the surrounding function returns. Used for cleanup. |
| **struct tag** | The `` `json:"user_id"` `` text after a field; tells `encoding/json` the JSON name. |
| **dependency injection** | Pass dependencies (a pool, a logger) in through constructors instead of creating them inside. |
| **middleware** | A function that wraps an `http.Handler` to run code before and after it. |
| **table-driven test** | One test function looping over a slice of cases, each with a name, input and expected output. |

## 10. Lesson list

| # | File | Topic |
|---|---|---|
| 00 | [00-README.md](00-README.md) | This file |
| 01 | [01-repo-and-env.md](01-repo-and-env.md) | Folders, `.gitignore`, env files, Neon strings |
| 02 | [02-go-project-and-config.md](02-go-project-and-config.md) | `go mod init`, config package |
| 03 | [03-http-server-and-healthz.md](03-http-server-and-healthz.md) | chi, `/healthz`, graceful shutdown |
| 04 | [04-database-and-migrations.md](04-database-and-migrations.md) | pgx, goose, `/healthz/db` |
| 05 | [05-roles-tables.md](05-roles-tables.md) | `roles`, `user_roles` |
| 06 | [06-better-auth-frontend.md](06-better-auth-frontend.md) | Better Auth in Next.js |
| 07 | [07-jwt-middleware-go.md](07-jwt-middleware-go.md) | JWKS verification middleware |
| 08 | [08-identity-module.md](08-identity-module.md) | Identity module, `GET /me` |
| 09 | [09-role-middleware-and-admin-endpoint.md](09-role-middleware-and-admin-endpoint.md) | `RequireRole`, grant roles |
| 10 | [10-frontend-calls-backend.md](10-frontend-calls-backend.md) | `api.ts`, dashboard, redirect |
| 11 | [11-tests-and-checklist.md](11-tests-and-checklist.md) | Tests, checklist, recap |
| 12 | [12-onboarding-design-and-tables.md](12-onboarding-design-and-tables.md) | Investor KYC and issuer approval flows, `kyc_verifications`, `issuer_applications` |
| 13 | [13-kyc-module-go.md](13-kyc-module-go.md) | `kyc` module: Aadhaar + email OTP, grants `investor` |
| 14 | [14-issuer-module-go.md](14-issuer-module-go.md) | `issuer` module: apply, admin approve or reject, grants `issuer` |
| 15 | [15-frontend-onboarding.md](15-frontend-onboarding.md) | `/onboarding`, KYC form, issuer form, admin review page |

Lessons 12 to 15 replace the old rule "a new user becomes an investor on first `/me`" with "a role is granted only by the event that earns it".

## Checkpoint

- [ ] I ran every command in the prerequisites table and each printed a version.
- [ ] I have a Neon project and can open its console.
- [ ] I read section 8 and know `Backend/` already exists.
