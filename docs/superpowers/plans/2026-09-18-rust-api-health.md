# Rust Axum API Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a modular Rust API server using Axum and Tokio with configuration loading, structured tracing, and a `GET /health` endpoint returning `{"status": "ok"}`.

**Architecture:** A layered Rust application where `lib.rs` provides `create_app()` producing an `axum::Router` equipped with tracing middleware and route handlers, `config.rs` reads host/port configuration, and `main.rs` binds the TCP listener and launches the server. Testing is done in-process against `create_app()` via `tower::ServiceExt::oneshot`.

**Tech Stack:** Rust 2021 edition, Axum 0.8, Tokio, Serde, Serde JSON, Tracing, Tracing Subscriber, Tower HTTP, Tower, HTTP Body Util.

**Spec:** `docs/superpowers/specs/2026-09-18-rust-api-health-design.md`

## Global Constraints

- Must compile on Rust 2021 edition.
- Default host: `0.0.0.0`, default port: `8080`.
- Endpoint `GET /health` must respond with HTTP `200 OK`, `Content-Type: application/json`, and body `{"status":"ok"}`.
- Tracing/logging configured using `tracing-subscriber` and `tower-http::trace::TraceLayer`.

---

### Task 1: Initialize Cargo Package and Dependencies

**Files:**
- Create: `Cargo.toml`
- Create: `src/main.rs`
- Create: `.gitignore`

**Interfaces:**
- Consumes: None
- Produces: Base executable cargo project with dependencies `axum`, `tokio`, `serde`, `serde_json`, `tracing`, `tracing-subscriber`, `tower`, `tower-http`, `http-body-util`.

- [ ] **Step 1: Write `.gitignore`**

```gitignore
/target
Cargo.lock
**/*.rs.bk
*.swp
```

- [ ] **Step 2: Create `Cargo.toml` with pinned dependencies**

```toml
[package]
name = "rust_api"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.8"
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tower-http = { version = "0.6", features = ["trace"] }

[dev-dependencies]
tower = { version = "0.5", features = ["util"] }
http-body-util = "0.1"
```

- [ ] **Step 3: Create initial placeholder `src/main.rs`**

```rust
fn main() {
    println!("Rust API initializing...");
}
```

- [ ] **Step 4: Verify Cargo builds successfully**

Run: `cargo check`
Expected: Compiles and finishes with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add Cargo.toml Cargo.lock src/main.rs .gitignore
git commit -m "chore: initialize cargo project with axum and tokio dependencies"
```

---

### Task 2: Implement Configuration Module

**Files:**
- Create: `src/config.rs`
- Modify: `src/lib.rs` (or create if not present)

**Interfaces:**
- Consumes: `std::env`
- Produces:
  - `pub struct Config { pub host: String, pub port: u16 }`
  - `impl Config { pub fn from_env() -> Self; pub fn address(&self) -> String; }`

- [ ] **Step 1: Write unit tests for `Config` in `src/config.rs`**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_defaults() {
        // Ensure without env variables set, defaults are 0.0.0.0:8080
        std::env::remove_var("HOST");
        std::env::remove_var("PORT");
        let config = Config::from_env();
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 8080);
        assert_eq!(config.address(), "0.0.0.0:8080");
    }

    #[test]
    fn test_config_from_env() {
        std::env::set_var("HOST", "127.0.0.1");
        std::env::set_var("PORT", "3000");
        let config = Config::from_env();
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 3000);
        assert_eq!(config.address(), "127.0.0.1:3000");
        // Clean up
        std::env::remove_var("HOST");
        std::env::remove_var("PORT");
    }
}
```

- [ ] **Step 2: Implement `src/config.rs`**

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Config {
    pub host: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> Self {
        let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = std::env::var("PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(8080);

        Self { host, port }
    }

    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_defaults() {
        std::env::remove_var("HOST");
        std::env::remove_var("PORT");
        let config = Config::from_env();
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 8080);
        assert_eq!(config.address(), "0.0.0.0:8080");
    }

    #[test]
    fn test_config_from_env() {
        std::env::set_var("HOST", "127.0.0.1");
        std::env::set_var("PORT", "3000");
        let config = Config::from_env();
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 3000);
        assert_eq!(config.address(), "127.0.0.1:3000");
        std::env::remove_var("HOST");
        std::env::remove_var("PORT");
    }
}
```

- [ ] **Step 3: Expose `config` in `src/lib.rs`**

```rust
pub mod config;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test --lib config`
Expected: 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/config.rs src/lib.rs
git commit -m "feat: implement configuration module with env var support"
```

---

### Task 3: Implement Health Check Route & Application Router with TDD

**Files:**
- Create: `src/routes/mod.rs`
- Create: `src/routes/health.rs`
- Modify: `src/lib.rs`
- Create: `tests/health_test.rs`

**Interfaces:**
- Consumes: `axum::Router`, `serde::Serialize`, `serde::Deserialize`
- Produces:
  - `pub struct HealthResponse { pub status: String }`
  - `pub async fn health_check() -> axum::Json<HealthResponse>`
  - `pub fn create_app() -> axum::Router`

- [ ] **Step 1: Write integration test for `GET /health` in `tests/health_test.rs`**

```rust
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use rust_api::{create_app, routes::health::HealthResponse};
use tower::ServiceExt;

#[tokio::test]
async fn test_health_check_returns_200_and_status_ok() {
    let app = create_app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get("content-type").unwrap(),
        "application/json"
    );

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body: HealthResponse = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        body,
        HealthResponse {
            status: "ok".to_string()
        }
    );
}
```

- [ ] **Step 2: Run test to verify it fails (compilation failure as `create_app` does not exist)**

Run: `cargo test --test health_test`
Expected: FAIL with compilation error (module/function not found).

- [ ] **Step 3: Implement `src/routes/health.rs`**

```rust
use axum::Json;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct HealthResponse {
    pub status: String,
}

pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
    })
}
```

- [ ] **Step 4: Implement `src/routes/mod.rs`**

```rust
pub mod health;

use axum::{routing::get, Router};

pub fn routes() -> Router {
    Router::new().route("/health", get(health::health_check))
}
```

- [ ] **Step 5: Implement `create_app` in `src/lib.rs`**

```rust
pub mod config;
pub mod routes;

use axum::Router;
use tower_http::trace::TraceLayer;

pub fn create_app() -> Router {
    Router::new()
        .merge(routes::routes())
        .layer(TraceLayer::new_for_http())
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cargo test --test health_test`
Expected: PASS (1 passed).

- [ ] **Step 7: Commit**

```bash
git add src/routes/ tests/health_test.rs src/lib.rs
git commit -m "feat: implement GET /health endpoint and create_app router"
```

---

### Task 4: Implement Main Bootstrap and Server Runner

**Files:**
- Modify: `src/main.rs`

**Interfaces:**
- Consumes: `rust_api::config::Config`, `rust_api::create_app()`, `tokio::net::TcpListener`, `tracing_subscriber`
- Produces: Binary executable that listens on configured address and serves requests.

- [ ] **Step 1: Implement `src/main.rs`**

```rust
use rust_api::{config::Config, create_app};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing subscriber
    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "rust_api=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env();
    let addr = config.address();

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Server listening on http://{}", addr);

    let app = create_app();
    axum::serve(listener, app).await?;

    Ok(())
}
```

- [ ] **Step 2: Verify binary builds and tests pass**

Run: `cargo check --bin rust_api`
Expected: SUCCESS

Run: `cargo test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/main.rs
git commit -m "feat: wire main application server with tracing and listener"
```

---

### Task 5: End-to-End Verification & Documentation

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: Running binary
- Produces: Project documentation with instructions on running, testing, and calling `/health`.

- [ ] **Step 1: Write `README.md`**

```markdown
# Rust API Server

A lightweight, modular API server built with [Axum](https://github.com/tokio-rs/axum) and [Tokio](https://tokio.rs).

## Features

- **Axum 0.8** web router
- **Structured Tracing** with `tracing` and `tower-http`
- **Configurable** via `HOST` and `PORT` environment variables (defaults to `0.0.0.0:8080`)
- **Health Check Endpoint** at `GET /health`

## Getting Started

### Prerequisites

- Rust (edition 2021) and Cargo

### Running the Server

\`\`\`bash
cargo run
\`\`\`

Specify custom host or port:
\`\`\`bash
PORT=3000 HOST=127.0.0.1 cargo run
\`\`\`

### Running Tests

\`\`\`bash
cargo test
\`\`\`

### Health Check Endpoint

\`\`\`bash
curl http://localhost:8080/health
\`\`\`

Response:
\`\`\`json
{
  "status": "ok"
}
\`\`\`
```

- [ ] **Step 2: Run verification test suite**

Run: `cargo test`
Expected: All unit and integration tests pass.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and endpoint documentation"
```
