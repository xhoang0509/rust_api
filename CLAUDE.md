# rust_api — Project Conventions

## Stack
- Backend: Rust, Axum 0.8, SQLx (SQLite, `sqlite://rust_api.db?mode=rwc`), Argon2 + JWT auth
- Frontend: React 19 + TypeScript + Vite + Tailwind v4, embedded into the binary via `rust-embed`
- Migrations: SQLx migrations in `migrations/`
- Tests: `cargo test` for backend, `tsc --noEmit` + build for frontend. `make test` runs both.

## Conventions
- Protected endpoints use the `AuthUser` extractor; verify resource ownership before update/delete.
- Error responses must follow a consistent JSON format (see `src/error.rs` if available).
- Pagination uses `page` and `per_page`, returning `{items, total, page, per_page, total_pages}`.
- Top-level view screens go into `frontend/src/views/`, and reusable UI components go into `frontend/src/components/`, calling APIs via `frontend/src/api/` (if present), styled with Tailwind utility classes (avoid custom CSS unless strictly necessary).
- Always run `make test` after modifying code before considering the task complete.

## Feature Workflow
Every new feature goes through: BA spec → Frontend design → Backend implement → Frontend implement → Test → Review.
