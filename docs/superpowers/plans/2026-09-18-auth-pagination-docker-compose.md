# Auth, Pagination/Search & Single-Binary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full-featured Pagination and Search for Posts, secure JWT Authentication and Authorization with Argon2, Single-Binary frontend embedding using `rust-embed`, and a production-ready `docker-compose.yml` deployment.

**Architecture:**
- **Backend:** Axum 0.8 REST API server with SQLx SQLite file persistence.
- **Pillar 1:** Query param filters (`page`, `limit`, `search`, `author_id`) returning `PaginatedResponse<PostWithAuthor>`, wired with debounced search and pagination controls in React.
- **Pillar 2:** Password hashing with `argon2`, JWT verification/issuance with `jsonwebtoken`, `AuthUser` extractor enforcing post creation and ownership validation on edits/deletions.
- **Pillar 3:** Static asset serving using `rust-embed` and `mime_guess` with SPA fallback, coupled with root `docker-compose.yml` and Makefile targets.

**Tech Stack:** Rust 2021, Axum 0.8, SQLx 0.8, Tokio, Argon2 0.5, JSONWebToken 9, Rust-Embed 8, Mime_Guess 2, React 19, Vite, TypeScript, Tailwind CSS v4, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-18-auth-pagination-docker-compose-design.md`

## Global Constraints

- SQLite file database (`DATABASE_URL=sqlite://rust_api.db?mode=rwc`).
- JWT Secret configured via `Config` (`JWT_SECRET`, default for dev `"dev-secret-key-at-least-32-bytes-long"`).
- Password hashing must use `argon2`.
- All mutating post operations (`POST /api/posts`, `PUT /api/posts/:id`, `DELETE /api/posts/:id`) must require authentication and enforce author ownership.
- Static assets embedded directly via `rust-embed` from `frontend/dist` with SPA fallback routing.
- All tests must pass with `cargo test` and `npm run build` in `frontend/`.

---

### Task 1: Backend Pagination, Search & Filtering for Posts

**Files:**
- Modify: `src/models/post.rs`
- Modify: `src/routes/posts.rs`
- Modify: `tests/posts_test.rs`

**Interfaces:**
- Produces:
  - `PostQuery { page: Option<u32>, limit: Option<u32>, search: Option<String>, author_id: Option<i64> }`
  - `PaginatedResponse<T> { items: Vec<T>, total: i64, page: u32, limit: u32, total_pages: u32 }`
  - `GET /api/posts` handler returning `Json<PaginatedResponse<PostWithAuthor>>`

- [ ] **Step 1: Write integration tests for pagination and search**

Add tests to `tests/posts_test.rs`:
- Test pagination default (`page=1, limit=10`)
- Test search filtering by title/content substring
- Test author_id filtering
- Test response envelope structure (`total`, `page`, `limit`, `total_pages`)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test --test posts_test`
Expected: FAIL (types and handler signatures mismatch)

- [ ] **Step 3: Update `src/models/post.rs`**

Add `PostQuery` and `PaginatedResponse<T>`:
```rust
#[derive(Debug, Deserialize, Clone, Default)]
pub struct PostQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub search: Option<String>,
    pub author_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
    pub total_pages: u32,
}
```

- [ ] **Step 4: Update `src/routes/posts.rs` list_posts handler**

Update `list_posts` to accept `Query(query): Query<PostQuery>`:
- Build SQL queries dynamically for `COUNT(*)` and items query with `LIMIT` and `OFFSET`.
- Support `search` with `WHERE (p.title LIKE ? OR p.content LIKE ?)` and `author_id`.
- Calculate `total_pages = (total as f64 / limit as f64).ceil() as u32`.

- [ ] **Step 5: Run tests and verify they pass**

Run: `cargo test --test posts_test`
Expected: PASS (all tests pass)

- [ ] **Step 6: Commit**

```bash
git add src/models/post.rs src/routes/posts.rs tests/posts_test.rs
git commit -m "feat: implement pagination and search query filters on GET /api/posts"
```

---

### Task 2: Frontend Search Bar & Pagination Controls

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/posts.ts`
- Create: `frontend/src/components/SearchBar.tsx`
- Create: `frontend/src/components/Pagination.tsx`
- Modify: `frontend/src/components/PostList.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces:
  - `PaginatedResponse<T>` and `PostQueryParams` TypeScript types.
  - Interactive search bar with debounce.
  - Full pagination controls (previous, next, page numbers, item count).

- [ ] **Step 1: Update `frontend/src/types.ts` and `frontend/src/api/posts.ts`**

Define `PaginatedResponse<T>` and `PostQueryParams` interfaces and update `getPosts(params?: PostQueryParams)`.

- [ ] **Step 2: Create `frontend/src/components/SearchBar.tsx`**

Implement search input with 300ms debounce and author filter dropdown.

- [ ] **Step 3: Create `frontend/src/components/Pagination.tsx`**

Implement pagination buttons with current page highlight, disabled states for first/last page, and items counter.

- [ ] **Step 4: Update `PostList.tsx` and `App.tsx`**

Connect search and pagination controls to state and re-fetch posts on filter/page change.

- [ ] **Step 5: Verify build**

Run: `cd frontend && npm run build`
Expected: Succeeded with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add search bar, author filtering, and pagination controls"
```

---

### Task 3: Backend Authentication Models, Password Hashing & JWT

**Files:**
- Modify: `Cargo.toml`
- Create: `migrations/0002_auth.sql`
- Create: `src/auth.rs`
- Modify: `src/config.rs`
- Modify: `src/models/author.rs`
- Create: `src/routes/auth.rs`
- Modify: `src/routes/mod.rs`
- Modify: `src/lib.rs`
- Create: `tests/auth_test.rs`

**Interfaces:**
- Produces:
  - `argon2` password hashing (`hash_password`, `verify_password`)
  - JWT token issuance and decoding (`generate_token`, `verify_token`, `Claims`)
  - Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`

- [ ] **Step 1: Add dependencies to `Cargo.toml`**

Add `argon2 = "0.5"`, `jsonwebtoken = "9"`, `rand = "0.8"`.

- [ ] **Step 2: Create migration `migrations/0002_auth.sql`**

```sql
ALTER TABLE authors ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
```

- [ ] **Step 3: Add `jwt_secret` to `src/config.rs`**

Add `pub jwt_secret: String` with environment fallback.

- [ ] **Step 4: Implement `src/auth.rs`**

Implement password hashing with `argon2` and JWT generation/verification with `jsonwebtoken`.

- [ ] **Step 5: Write integration tests in `tests/auth_test.rs`**

Test user registration, duplicate email rejection, login with valid/invalid credentials, and token verification on `/api/auth/me`.

- [ ] **Step 6: Implement `src/routes/auth.rs` and wire into `src/routes/mod.rs`**

Implement handlers for register, login, and me.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cargo test --test auth_test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add Cargo.toml Cargo.lock migrations/ src/auth.rs src/config.rs src/models/author.rs src/routes/auth.rs src/routes/mod.rs src/lib.rs tests/auth_test.rs
git commit -m "feat: implement Argon2 password hashing and JWT authentication endpoints"
```

---

### Task 4: Axum Auth Extractor & Post Ownership Authorization

**Files:**
- Create: `src/extractors/mod.rs`
- Create: `src/extractors/auth_user.rs`
- Modify: `src/routes/posts.rs`
- Modify: `src/lib.rs`
- Modify: `tests/posts_test.rs`

**Interfaces:**
- Produces:
  - `AuthUser` extractor implementing `FromRequestParts<AppState>`
  - Protected `POST /api/posts` automatically associating `author_id = auth_user.id`
  - Protected `PUT /api/posts/:id` and `DELETE /api/posts/:id` enforcing `post.author_id == auth_user.id` (returns `403 Forbidden` otherwise)

- [ ] **Step 1: Write integration tests for protected post endpoints**

Update `tests/posts_test.rs`:
- Test creating post without token returns `401 Unauthorized`
- Test author A creating post uses author A's ID
- Test author B attempting to update or delete author A's post returns `403 Forbidden`
- Test author A successfully updating and deleting their own post

- [ ] **Step 2: Implement `src/extractors/auth_user.rs`**

Extract `Authorization: Bearer <token>` from headers, verify token using `jwt_secret`, and return `AuthUser { id, email }`.

- [ ] **Step 3: Protect post mutating routes in `src/routes/posts.rs`**

Use `AuthUser` in `create_post`, `update_post`, and `delete_post`. Enforce ownership check before update/delete.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/extractors/ src/routes/posts.rs src/lib.rs tests/posts_test.rs
git commit -m "feat: add AuthUser extractor and enforce post ownership authorization"
```

---

### Task 5: Frontend Auth Context, Registration/Login Modal & Post Form Protection

**Files:**
- Modify: `frontend/src/types.ts`
- Create: `frontend/src/api/auth.ts`
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/components/AuthModal.tsx`
- Modify: `frontend/src/components/PostForm.tsx`
- Modify: `frontend/src/components/PostList.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces:
  - Global `useAuth()` hook for state management (token in `localStorage`, user details, login, logout, register).
  - Automatically attached `Authorization: Bearer <token>` in API requests.
  - Login/Register modal with validation.
  - Conditional rendering: Post creation and edit/delete actions restricted to logged-in owner.

- [ ] **Step 1: Update API client and create `frontend/src/api/auth.ts`**

Update `frontend/src/api/client.ts` to automatically read token from `localStorage` and attach to headers. Implement `login`, `register`, `getMe`.

- [ ] **Step 2: Implement `frontend/src/context/AuthContext.tsx`**

Manage user authentication state, persisted token, and session validation.

- [ ] **Step 3: Implement `frontend/src/components/AuthModal.tsx`**

Interactive modal with toggle between "Login" and "Register" forms.

- [ ] **Step 4: Update PostForm, PostList, and App.tsx**

- Add Login/Logout buttons and current user badge in header.
- In `PostList`, only display Edit/Delete buttons on posts belonging to the authenticated author.
- In `PostForm`, automatically assign the current author ID and remove the manual author select dropdown.

- [ ] **Step 5: Verify build**

Run: `cd frontend && npm run build`
Expected: Builds with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add AuthContext, Login/Register modal, and post ownership controls"
```

---

### Task 6: Single-Binary Asset Embedding via `rust-embed` & SPA Routing

**Files:**
- Modify: `Cargo.toml`
- Create: `src/static_assets.rs`
- Modify: `src/lib.rs`
- Modify: `Makefile`
- Modify: `tests/health_test.rs` (or new test)

**Interfaces:**
- Produces:
  - Embedded `frontend/dist` in release builds via `rust_embed::RustEmbed`.
  - Non-API routes serve `index.html` (SPA fallback).
  - Static files (JS, CSS, SVGs) served with accurate MIME types.

- [ ] **Step 1: Add `rust-embed` and `mime_guess` to `Cargo.toml`**

Add `rust-embed = "8"` and `mime_guess = "2"`.

- [ ] **Step 2: Implement `src/static_assets.rs`**

```rust
use axum::{
    body::Body,
    http::{header, HeaderValue, Response, StatusCode, Uri},
    response::IntoResponse,
};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "frontend/dist/"]
struct Assets;

pub async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let asset = if path.is_empty() {
        Assets::get("index.html")
    } else {
        Assets::get(path).or_else(|| Assets::get("index.html"))
    };

    match asset {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            Response::builder()
                .header(header::CONTENT_TYPE, HeaderValue::from_str(mime.as_ref()).unwrap())
                .body(Body::from(content.data))
                .unwrap()
        }
        None => Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::from("404 Not Found"))
            .unwrap(),
    }
}
```

- [ ] **Step 3: Wire `static_handler` as fallback in `src/lib.rs`**

Attach `.fallback(static_assets::static_handler)` to the Axum Router.

- [ ] **Step 4: Update `Makefile` to build frontend before cargo build**

Ensure `make build` compiles `frontend` first so `frontend/dist` is populated.

- [ ] **Step 5: Verify build & tests**

Run: `make test && make build`
Expected: Passes with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add Cargo.toml Cargo.lock src/static_assets.rs src/lib.rs Makefile
git commit -m "feat: embed frontend assets into binary using rust-embed with SPA fallback"
```

---

### Task 7: Production Dockerfile & Docker Compose Orchestration

**Files:**
- Modify: `Dockerfile`
- Create: `docker-compose.yml`
- Modify: `Makefile`
- Modify: `README.md`

**Interfaces:**
- Produces:
  - Multi-stage Dockerfile that builds frontend first, then builds single binary with embedded assets.
  - `docker-compose.yml` defining `app` service with persistent volume `/data` for SQLite.
  - Makefile targets: `docker-up`, `docker-down`, `docker-logs`.

- [ ] **Step 1: Update `Dockerfile` to multi-stage build frontend & backend**

Add Node.js frontend build stage, then copy `frontend/dist` into Rust builder stage so `rust-embed` bundles it.

- [ ] **Step 2: Create `docker-compose.yml`**

Define `app` service with persistent volume for SQLite file:
```yaml
services:
  app:
    build: .
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

- [ ] **Step 3: Update `Makefile` and `README.md`**

Add `docker-up`, `docker-down`, `docker-logs` commands to `Makefile` and document all new features in `README.md`.

- [ ] **Step 4: Verify tests and Docker container build**

Run: `make test`
Run: `docker build -t rust_api:latest .` (if docker daemon available) or `cargo test`
Expected: Success.

- [ ] **Step 5: Commit and push**

```bash
git add Dockerfile docker-compose.yml Makefile README.md
git commit -m "feat: add multi-stage frontend+backend Dockerfile, docker-compose.yml, and documentation"
git push origin main
```
