# Rust API Server & React Frontend

A full-stack web application featuring an asynchronous REST API built with [Axum](https://github.com/tokio-rs/axum), SQLite persistence via [SQLx](https://github.com/launchbadge/sqlx), Argon2 password hashing with JWT authentication, and an interactive frontend built with React 19, TypeScript, and Tailwind CSS (bundled directly into the compiled binary with `rust-embed`).

## Features

- **Backend (Axum 0.8 & Tokio)**:
  - SQLite database with SQLx migrations and WAL mode (`sqlite://rust_api.db?mode=rwc` by default)
  - Foreign key enforcement with `ON DELETE CASCADE` from authors to posts
  - User registration and login with Argon2id password hashing and JWT authentication
  - Protected endpoints using `AuthUser` extractor for author verification and post ownership enforcement
  - Pagination (`page`, `per_page`), search (`search`), and author filtering (`author_id`) on posts
  - Permissive CORS for cross-origin local development
  - Structured tracing with `tracing` and `tower-http`
  - Health check endpoint at `GET /health`
  - Embedded frontend assets served directly from the binary with SPA client-side fallback
  - Full CRUD REST API for Authors and Posts with relations

- **Frontend (React 19 & Tailwind CSS v4)**:
  - TypeScript frontend powered by Vite
  - Embedded into the release binary via `rust-embed`
  - Authentication modal with Login/Register tabs and persistent JWT state in `localStorage`
  - Interactive Authors tab (list, create, edit, delete with post count badges)
  - Interactive Posts tab (search bar, author filter dropdown, pagination controls, ownership badges)
  - Cascading deletion feedback and responsive UI

## Getting Started

### Prerequisites

- Rust (edition 2021) and Cargo
- Node.js (v18+) and npm
- Docker and Docker Compose (optional, for containerized deployment)

### Development with Make

A root `Makefile` is provided for running and building the project:

- **Run both backend and frontend concurrently**:
  ```bash
  make dev
  ```
  Backend runs at `http://localhost:8080`, and frontend runs at `http://localhost:5173` (with `/api` and `/health` proxy configured).

- **Run backend only**:
  ```bash
  make dev-backend
  ```

- **Run frontend only**:
  ```bash
  make dev-frontend
  ```

- **Run all tests (Rust tests + Frontend TypeScript check/build)**:
  ```bash
  make test
  ```

- **Build everything for production**:
  ```bash
  make build
  ```

- **Docker Compose commands**:
  ```bash
  make docker-up    # Build and start containers in detached mode
  make docker-logs  # Stream live container logs
  make docker-down  # Stop and remove containers
  ```

- **Clean build artifacts**:
  ```bash
  make clean
  ```

- **Display help**:
  ```bash
  make help
  ```

---

## Configuration & SQLite Persistence

The backend configures database, authentication, and network parameters through environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLite connection URL | `sqlite://rust_api.db?mode=rwc` |
| `HOST` | Host address to bind | `0.0.0.0` |
| `PORT` | Port to listen on | `8080` |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | `default-insecure-jwt-secret-key-change-me` |

Database migrations run automatically at server startup.

---

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Authentication
- `POST /api/auth/register` - Register a new author/user
  ```json
  { "name": "alice", "password": "securepassword", "bio": "Optional bio" }
  ```
- `POST /api/auth/login` - Authenticate and receive JWT token
  ```json
  { "name": "alice", "password": "securepassword" }
  ```
- `GET /api/auth/me` - Get current authenticated user details (`Authorization: Bearer <token>`)

### Authors
- `GET /api/authors` - List all authors
- `POST /api/authors` - Create an author (`{"name": "...", "bio": "..."}`)
- `GET /api/authors/{id}` - Get an author by ID
- `PUT /api/authors/{id}` - Update author (`{"name": "...", "bio": "..."}`)
- `DELETE /api/authors/{id}` - Delete author (cascades to author's posts)

### Posts
- `GET /api/posts` - List posts with pagination, search, and author filtering:
  - Query parameters:
    - `page` (optional, default: `1`): Page number (1-indexed)
    - `per_page` (optional, default: `10`, max: `100`): Number of items per page
    - `search` (optional): Case-insensitive search matching post title or content
    - `author_id` (optional): Filter posts by author ID
  - Returns paginated payload:
    ```json
    {
      "items": [ ... ],
      "total": 42,
      "page": 1,
      "per_page": 10,
      "total_pages": 5
    }
    ```
- `POST /api/posts` - Create a post (Protected, requires `Authorization: Bearer <token>`):
  ```json
  { "title": "...", "content": "..." }
  ```
- `GET /api/posts/{id}` - Get post by ID (includes author details)
- `PUT /api/posts/{id}` - Update post (Protected, only post owner can edit):
  ```json
  { "title": "...", "content": "..." }
  ```
- `DELETE /api/posts/{id}` - Delete post (Protected, only post owner can delete)

---

## Docker & Docker Compose Deployment

### Multi-Stage Dockerfile
The project uses a 3-stage `Dockerfile`:
1. **Frontend Builder** (`node:20-bookworm-slim`): Compiles React + Vite into `frontend/dist/`.
2. **Rust Builder** (`rust:bookworm`): Embeds frontend assets into the Rust binary at compile time via `rust-embed`.
3. **Runtime** (`debian:bookworm-slim`): Minimal, non-root (`appuser`, UID 10001) runtime with persistent volume `/data` and healthcheck.

### Docker Compose
Run the entire application using Docker Compose with SQLite data persistence:

```bash
docker compose up -d --build
```
Or with Make:
```bash
make docker-up
```

Access the application at `http://localhost:8080`.

To stop the containers:
```bash
make docker-down
```
