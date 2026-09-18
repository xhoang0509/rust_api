# Design Specification: Authentication, Pagination/Search, and Single-Binary Docker Compose

- **Date:** 2026-09-18
- **Topic:** Three-Pillar Expansion (Auth, Pagination & Search, Single-Binary & Docker Compose)
- **Backend:** Rust, Axum 0.8, Tokio, SQLx (SQLite), Argon2, JSONWebToken, rust-embed
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Deployment:** Docker, Docker Compose, Single Embedded Binary

---

## 1. Overview & Goals

Expand the `rust_api` application across three major pillars:
1. **Pagination, Search & Filtering**: Add flexible query filtering (`page`, `limit`, `search`, `author_id`) on `/api/posts` with paginated metadata envelopes and debounced search UI.
2. **Authentication & Authorization**: Add secure password hashing (Argon2), JWT authentication (`Authorization: Bearer <token>`), user registration/login, and ownership enforcement for post mutating routes.
3. **Single-Binary Embedding & Docker Compose**: Embed the compiled React frontend into the Rust binary at build time using `rust-embed` with client-side SPA routing fallback, plus `docker-compose.yml` for unified deployment with persistent volume mounting.

---

## 2. Pillar 1: Pagination, Search & Filtering

### 2.1 Backend Contract
- **Endpoint**: `GET /api/posts`
- **Query Parameters**:
  - `page`: `Option<u32>` (default `1`, min `1`)
  - `limit`: `Option<u32>` (default `10`, min `1`, max `100`)
  - `search`: `Option<String>` (fuzzy substring search against post `title` and `content`)
  - `author_id`: `Option<i64>` (exact author filter)
- **Envelope Response**:
  ```json
  {
    "items": [
      {
        "id": 1,
        "author_id": 2,
        "author_name": "Alice",
        "author_email": "alice@example.com",
        "title": "Getting Started with Axum",
        "content": "Full content...",
        "created_at": "2026-09-18T10:00:00Z",
        "updated_at": "2026-09-18T10:00:00Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10,
    "total_pages": 5
  }
  ```

### 2.2 Frontend UI
- `SearchBar.tsx`: Input box with 300ms debounce triggering search query, plus author filter dropdown.
- `Pagination.tsx`: Previous, Next, page numbers, and total items display.

---

## 3. Pillar 2: Authentication & Authorization

### 3.1 Database Migration (`migrations/0002_auth.sql`)
```sql
ALTER TABLE authors ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
```
*(For existing authors without passwords, default empty string prevents login until registered or updated).*

### 3.2 Security & Cryptography
- **Password Hashing**: `argon2` crate with secure salt generation and constant-time verification.
- **Tokens**: `jsonwebtoken` (HS256) with `sub` (author ID), `email`, and expiration (`exp`, 24 hours).
- **Environment**: `JWT_SECRET` configured via `Config` (with a default for dev/tests).

### 3.3 Auth Endpoints
- `POST /api/auth/register`:
  - Body: `{"name": "Alice", "email": "alice@example.com", "password": "securepassword"}`
  - Returns: `201 Created` with `{"token": "...", "author": {...}}`
- `POST /api/auth/login`:
  - Body: `{"email": "alice@example.com", "password": "securepassword"}`
  - Returns: `200 OK` with `{"token": "...", "author": {...}}`
- `GET /api/auth/me`:
  - Requires `Authorization: Bearer <token>`
  - Returns: `200 OK` with current author profile.

### 3.4 Protected Routes & Ownership
- `POST /api/posts`: Uses authenticated author's ID automatically (cannot forge other authors).
- `PUT /api/posts/:id` & `DELETE /api/posts/:id`: Requires authentication AND validates that `post.author_id == current_user.id` (returns `403 Forbidden` if attempting to edit/delete another author's post).
- `GET` routes remain public.

### 3.5 Frontend Auth State
- `AuthContext.tsx`: Manages token in `localStorage`, user state, `login()`, `register()`, `logout()`.
- API client automatically attaches `Authorization: Bearer <token>` if present.
- `AuthModal.tsx`: Clean tabbed modal for Login & Registration.

---

## 4. Pillar 3: Single-Binary Embedding & Docker Compose

### 4.1 Asset Embedding via `rust-embed`
- Axum route handler serving files from embedded struct `#[derive(RustEmbed)]` pointing to `../frontend/dist`.
- Correct MIME type guessing via `mime_guess`.
- SPA Fallback: Any non-API route (`/`, `/posts`, `/authors`, etc.) returns `index.html` with status `200 OK`.
- `/api/*` and `/health` routes are strictly handled by the REST router and never hit SPA fallback.

### 4.2 Docker Compose (`docker-compose.yml`)
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - HOST=0.0.0.0
      - PORT=8080
      - DATABASE_URL=sqlite:///data/rust_api.db?mode=rwc
      - JWT_SECRET=change-this-in-production-secret-key-32chars
    volumes:
      - app_data:/data
    restart: unless-stopped

volumes:
  app_data:
```

### 4.3 Makefile Targets
- `make docker-up`: Builds and runs `docker compose up -d`.
- `make docker-down`: Stops `docker compose down`.
- `make docker-logs`: Follows container logs.

---

## 5. Testing & Verification
- Unit and integration tests for:
  1. Pagination calculation and filter matching in `posts_test.rs`.
  2. Registration, password hashing, login, and JWT validation in `auth_test.rs`.
  3. Ownership protection (author A cannot edit author B's post).
  4. Embedded asset handler tests verifying `index.html` delivery.
