# SQLite CRUD & React Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full CRUD for Authors and Posts using SQLite file persistence in Rust Axum, paired with a React TypeScript Tailwind frontend and unified Makefile orchestration.

**Architecture:** 
- **Backend:** Axum 0.8 with `sqlx` (SQLite file `sqlite://rust_api.db?mode=rwc`). State holding `SqlitePool` injected into routes. CORS enabled via `tower-http`.
- **Database:** Auto-migrated schema with foreign key cascades in `migrations/0001_init.sql`.
- **Frontend:** React + Vite + TypeScript + Tailwind CSS in `frontend/` directory with API client and dynamic forms for Authors and Posts.
- **Automation:** Root `Makefile` for `dev`, `build`, `test`.

**Tech Stack:** Rust 2021, Axum 0.8, SQLx 0.8 (sqlite, runtime-tokio, migrate), Tower HTTP (cors, trace), Tokio, React, Vite, TypeScript, Tailwind CSS, Concurrently.

**Spec:** `docs/superpowers/specs/2026-09-18-sqlite-crud-react-design.md`

## Global Constraints

- SQLite file database: `rust_api.db` (auto-created if not present via `?mode=rwc`).
- Ignore `*.db`, `*.db-*` in `.gitignore`.
- Foreign key cascade delete enabled for Posts when Author is deleted.
- Frontend lives in `frontend/` and communicates with backend at `http://localhost:8080` (or through Vite proxy).
- Makefile must provide `dev`, `dev-backend`, `dev-frontend`, `build`, `test`.

---

### Task 1: Add SQLx & CORS Dependencies, Migration Script & DB Module

**Files:**
- Modify: `Cargo.toml`
- Modify: `.gitignore`
- Create: `migrations/0001_init.sql`
- Create: `src/db.rs`
- Modify: `src/config.rs`
- Modify: `src/lib.rs`

**Interfaces:**
- Produces:
  - `pub fn init_pool(database_url: &str) -> Result<sqlx::SqlitePool, sqlx::Error>`
  - Database schema with `authors` and `posts` tables
  - `DATABASE_URL` in `Config`

- [ ] **Step 1: Update `.gitignore` to ignore SQLite files**
Append `*.db`, `*.db-shm`, `*.db-wal` to `.gitignore`.

- [ ] **Step 2: Add SQLx and Tower-HTTP CORS dependencies in `Cargo.toml`**
Add `sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "migrate"] }` and add `"cors"` feature to `tower-http`.

- [ ] **Step 3: Create SQL migration `migrations/0001_init.sql`**
Write schema with foreign keys enabled, `authors` and `posts` tables.

- [ ] **Step 4: Update `src/config.rs` to include `database_url`**
Add `pub database_url: String` with default `"sqlite://rust_api.db?mode=rwc"`.

- [ ] **Step 5: Implement `src/db.rs`**
Implement `init_pool` with `SqlitePoolOptions`, running migrations automatically via `sqlx::migrate!("./migrations")`.

- [ ] **Step 6: Verify compilation and tests**
Run: `cargo test`
Expected: Passes with 0 errors.

- [ ] **Step 7: Commit**
```bash
git add Cargo.toml Cargo.lock .gitignore migrations/ src/db.rs src/config.rs src/lib.rs
git commit -m "feat: add sqlx sqlite support, migrations, and db pool initialization"
```

---

### Task 2: Implement Authors CRUD Models, Handlers & Integration Tests

**Files:**
- Create: `src/models/mod.rs`
- Create: `src/models/author.rs`
- Create: `src/routes/authors.rs`
- Modify: `src/routes/mod.rs`
- Modify: `src/lib.rs`
- Create: `tests/authors_test.rs`

**Interfaces:**
- Produces:
  - `Author`, `CreateAuthor`, `UpdateAuthor` structs
  - Routes: `GET /api/authors`, `POST /api/authors`, `GET /api/authors/:id`, `PUT /api/authors/:id`, `DELETE /api/authors/:id`
  - `AppState` holding `pool: SqlitePool`

- [ ] **Step 1: Write integration tests in `tests/authors_test.rs`**
Test author creation, retrieval, listing, update, and deletion against an in-memory SQLite database (`sqlite::memory:`).

- [ ] **Step 2: Run test to verify it fails**
Run: `cargo test --test authors_test`

- [ ] **Step 3: Implement `src/models/author.rs` and `src/models/mod.rs`**
Define `Author`, `CreateAuthor`, `UpdateAuthor` with Serde and SQLx `FromRow`.

- [ ] **Step 4: Implement `src/routes/authors.rs` and wire into `src/routes/mod.rs` and `src/lib.rs`**
Implement CRUD handlers with proper status codes (201 Created, 204 No Content, 404 Not Found, 400 Bad Request on duplicate email). Add `CorsLayer::permissive()`.

- [ ] **Step 5: Run tests to verify they pass**
Run: `cargo test --test authors_test`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/models/ src/routes/authors.rs src/routes/mod.rs src/lib.rs tests/authors_test.rs
git commit -m "feat: implement author CRUD endpoints and integration tests"
```

---

### Task 3: Implement Posts CRUD Models, Handlers & Integration Tests

**Files:**
- Create: `src/models/post.rs`
- Modify: `src/models/mod.rs`
- Create: `src/routes/posts.rs`
- Modify: `src/routes/mod.rs`
- Create: `tests/posts_test.rs`

**Interfaces:**
- Produces:
  - `Post`, `PostWithAuthor`, `CreatePost`, `UpdatePost`
  - Routes: `GET /api/posts`, `POST /api/posts`, `GET /api/posts/:id`, `PUT /api/posts/:id`, `DELETE /api/posts/:id`

- [ ] **Step 1: Write integration tests in `tests/posts_test.rs`**
Test creating post linked to author, getting post with author details, updating post, deleting post, and cascade deletion when author is deleted.

- [ ] **Step 2: Run test to verify it fails**
Run: `cargo test --test posts_test`

- [ ] **Step 3: Implement `src/models/post.rs`**
Define `Post`, `PostWithAuthor`, `CreatePost`, `UpdatePost`.

- [ ] **Step 4: Implement `src/routes/posts.rs` and wire into `src/routes/mod.rs`**
Implement handlers querying SQLite and returning joined post/author details.

- [ ] **Step 5: Update `src/main.rs` to initialize DB pool and pass to `create_app`**
Connect real SQLite pool on startup.

- [ ] **Step 6: Run all tests**
Run: `cargo test`
Expected: All tests pass.

- [ ] **Step 7: Commit**
```bash
git add src/models/post.rs src/models/mod.rs src/routes/posts.rs src/routes/mod.rs src/main.rs tests/posts_test.rs
git commit -m "feat: implement post CRUD endpoints with author relations and cascade tests"
```

---

### Task 4: Scaffold React Frontend with Vite, TypeScript & Tailwind CSS

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/index.css`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/authors.ts`
- Create: `frontend/src/api/posts.ts`

**Interfaces:**
- Produces:
  - Working React build in `frontend/`
  - Vite dev server proxying `/api` and `/health` to `http://localhost:8080`
  - Typed API services for Authors and Posts

- [ ] **Step 1: Scaffold `frontend/` directory with package.json, Tailwind, and Vite config**
- [ ] **Step 2: Implement TypeScript types in `frontend/src/types.ts`**
- [ ] **Step 3: Implement API client and service functions in `frontend/src/api/`**
- [ ] **Step 4: Verify build works in `frontend/`**
Run: `cd frontend && npm install && npm run build`
Expected: Vite build outputs clean dist with 0 errors.

- [ ] **Step 5: Commit**
```bash
git add frontend/
git commit -m "feat: scaffold React TypeScript Tailwind frontend and API client"
```

---

### Task 5: Build Interactive UI for Authors & Posts CRUD

**Files:**
- Create: `frontend/src/components/AuthorForm.tsx`
- Create: `frontend/src/components/AuthorList.tsx`
- Create: `frontend/src/components/PostForm.tsx`
- Create: `frontend/src/components/PostList.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces:
  - Complete UI with tabs for Authors & Posts
  - Real-time form submissions, updates, and deletions
  - Dynamic author selection in Post form

- [ ] **Step 1: Implement `AuthorForm.tsx` and `AuthorList.tsx`**
- [ ] **Step 2: Implement `PostForm.tsx` and `PostList.tsx`**
- [ ] **Step 3: Implement `App.tsx` with responsive navigation, notifications/alerts, and tab switching**
- [ ] **Step 4: Verify frontend build**
Run: `cd frontend && npm run build`
Expected: Build passes.

- [ ] **Step 5: Commit**
```bash
git add frontend/src/
git commit -m "feat: build interactive React UI for Author and Post CRUD"
```

---

### Task 6: Add Root Makefile and End-to-End Orchestration

**Files:**
- Create: `Makefile`
- Modify: `package.json` (or root tools)
- Modify: `README.md`

**Interfaces:**
- Produces:
  - `make dev`: Runs Axum backend and Vite frontend concurrently
  - `make dev-backend`: Runs backend
  - `make dev-frontend`: Runs frontend
  - `make build`: Builds backend and frontend
  - `make test`: Runs backend test suite

- [ ] **Step 1: Create root `Makefile`**
- [ ] **Step 2: Add `concurrently` support for `make dev`**
- [ ] **Step 3: Update `README.md` with instructions for `make dev`, SQLite, and React UI**
- [ ] **Step 4: Test `make test` and `make build`**
Run: `make test && make build`
Expected: All tests pass and build succeeds.

- [ ] **Step 5: Commit and push**
```bash
git add Makefile README.md
git commit -m "feat: add Makefile for dev, build, test orchestration and update docs"
git push origin main
```
