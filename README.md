# Rust API Server & React Frontend

A full-stack web application featuring an asynchronous REST API built with [Axum](https://github.com/tokio-rs/axum), SQLite persistence via [SQLx](https://github.com/launchbadge/sqlx), and an interactive frontend built with React 19, TypeScript, and Tailwind CSS.

## Features

- **Backend (Axum 0.8 & Tokio)**:
  - SQLite database with SQLx migrations and WAL mode (`sqlite://rust_api.db?mode=rwc` by default)
  - Foreign key enforcement with `ON DELETE CASCADE` from authors to posts
  - Permissive CORS for cross-origin local development
  - Structured tracing with `tracing` and `tower-http`
  - Health check endpoint at `GET /health`
  - Full CRUD REST API for Authors and Posts with relations

- **Frontend (React 19 & Tailwind CSS v4)**:
  - TypeScript frontend powered by Vite
  - Interactive Authors tab (list, create, edit, delete with post count badges)
  - Interactive Posts tab (list, filter by author, create, edit, delete)
  - Cascading deletion feedback and responsive UI

## Getting Started

### Prerequisites

- Rust (edition 2021) and Cargo
- Node.js (v18+) and npm

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

The backend configures database and network parameters through environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLite connection URL | `sqlite://rust_api.db?mode=rwc` |
| `HOST` | Host address to bind | `0.0.0.0` |
| `PORT` | Port to listen on | `8080` |

Database migrations run automatically at server startup.

---

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Authors
- `GET /api/authors` - List all authors
- `POST /api/authors` - Create an author (`{"name": "...", "bio": "..."}`)
- `GET /api/authors/{id}` - Get an author by ID
- `PUT /api/authors/{id}` - Update author (`{"name": "...", "bio": "..."}`)
- `DELETE /api/authors/{id}` - Delete author (cascades to author's posts)

### Posts
- `GET /api/posts` - List posts (supports optional query param `?author_id=<id>`)
- `POST /api/posts` - Create a post (`{"title": "...", "content": "...", "author_id": <id>}`)
- `GET /api/posts/{id}` - Get post by ID (includes author details)
- `PUT /api/posts/{id}` - Update post (`{"title": "...", "content": "...", "author_id": <id>}`)
- `DELETE /api/posts/{id}` - Delete post

---

## Docker Support

Build the Docker image:
```bash
docker build -t rust_api .
```

Run the container:
```bash
docker run -p 8080:8080 rust_api
```
