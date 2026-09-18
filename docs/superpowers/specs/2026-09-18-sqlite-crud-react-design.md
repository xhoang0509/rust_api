# Design Specification: SQLite Authors & Posts CRUD with React Frontend

- **Date:** 2026-09-18
- **Topic:** Full-stack Authors & Posts CRUD with SQLite file persistence and React UI
- **Backend:** Rust, Axum 0.8, Tokio, SQLx (SQLite file)
- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Orchestration:** Makefile (`make dev`, `make build`, `make test`)

## 1. Overview

Extend the Rust Axum API to support full CRUD operations on `authors` and `posts` using an SQLite file database (`sqlite://rust_api.db?mode=rwc`). Build a clean React TypeScript frontend to manage authors and posts with interactive forms, tables/cards, and validation. Orchestrate both servers using a unified `Makefile`.

## 2. Architecture & File Structure

```text
rust_api/
├── Makefile                     # Root orchestration: dev, dev-backend, dev-frontend, build, test
├── Cargo.toml                   # Axum, SQLx (sqlite, runtime-tokio, migrate), Tower HTTP (cors)
├── migrations/
│   └── 0001_init.sql            # Authors and Posts SQLite table definitions
├── src/
│   ├── main.rs                  # Startup, DB pool creation, migration execution, server listener
│   ├── lib.rs                   # Router initialization with AppState (SqlitePool) & CORS layer
│   ├── config.rs                # HOST, PORT, DATABASE_URL
│   ├── db.rs                    # SQLite connection pool setup and automatic migration execution
│   ├── models/
│   │   ├── mod.rs
│   │   ├── author.rs            # Author, CreateAuthor, UpdateAuthor models
│   │   └── post.rs              # Post, PostWithAuthor, CreatePost, UpdatePost models
│   └── routes/
│       ├── mod.rs               # Aggregates /health, /api/authors, /api/posts
│       ├── health.rs            # GET /health
│       ├── authors.rs           # Author CRUD handlers
│       └── posts.rs             # Post CRUD handlers
├── frontend/                    # Vite + React + TypeScript + Tailwind CSS
│   ├── package.json
│   ├── vite.config.ts           # Proxies /api and /health to http://localhost:8080
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts        # Fetch HTTP client with error handling
│   │   │   ├── authors.ts       # Author API service functions
│   │   │   └── posts.ts         # Post API service functions
│   │   ├── components/
│   │   │   ├── AuthorForm.tsx   # Author creation and edit form
│   │   │   ├── AuthorList.tsx   # Author table with delete/edit triggers
│   │   │   ├── PostForm.tsx     # Post form with dynamic Author select dropdown
│   │   │   └── PostList.tsx     # Post cards/table with delete/edit triggers
│   │   ├── types.ts             # TypeScript interfaces for Author, Post, etc.
│   │   ├── App.tsx              # Main UI with Navigation and Tabbed views
│   │   └── main.tsx
└── tests/
    ├── health_test.rs
    ├── authors_test.rs          # Integration tests for Author CRUD
    └── posts_test.rs            # Integration tests for Post CRUD
```

## 3. Database Specification

- **File Engine:** SQLite persistent file (`rust_api.db`).
- **Connection String:** `sqlite://rust_api.db?mode=rwc` (auto-creates file if missing).
- **Foreign Key Enforcement:** Enabled on pool creation (`PRAGMA foreign_keys = ON;`).
- **Schema:**
  ```sql
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
  );
  ```

## 4. API Endpoints

- **CORS:** Permissive CORS enabled for development via `tower-http::cors::CorsLayer`.
- **Authors:**
  - `GET /api/authors` -> `200 OK` `Vec<Author>`
  - `POST /api/authors` -> `201 Created` `Author`
  - `GET /api/authors/:id` -> `200 OK` `Author` (or `404`)
  - `PUT /api/authors/:id` -> `200 OK` `Author` (or `404`)
  - `DELETE /api/authors/:id` -> `204 No Content` (or `404`)
- **Posts:**
  - `GET /api/posts` -> `200 OK` `Vec<PostWithAuthor>` (joined with author name/email)
  - `POST /api/posts` -> `201 Created` `Post`
  - `GET /api/posts/:id` -> `200 OK` `PostWithAuthor` (or `404`)
  - `PUT /api/posts/:id` -> `200 OK` `Post` (or `404`)
  - `DELETE /api/posts/:id` -> `204 No Content` (or `404`)

## 5. React Frontend Specification

- Clean single-page application built with Vite, React 19 / 18, and Tailwind CSS.
- **Authors Tab:**
  - Form validation for `name` and `email`.
  - Author listing displaying ID, name, email, created date, and actions (Delete, Edit).
- **Posts Tab:**
  - Form with Title, Content, and dynamic `<select>` of existing Authors.
  - Post listing with Author badge/name, timestamps, and actions (Delete, Edit).
- **Vite Proxy:** Proxies `/api` requests to `http://localhost:8080`.

## 6. Makefile Orchestration

- `make dev`: Concurrently runs backend (`cargo run`) and frontend (`npm run dev` in `frontend/`).
- `make dev-backend`: Runs Axum server only.
- `make dev-frontend`: Runs Vite dev server only.
- `make build`: Builds frontend assets and backend release binary.
- `make test`: Runs Rust test suite and frontend check.
