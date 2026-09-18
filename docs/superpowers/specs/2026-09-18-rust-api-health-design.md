# Design Specification: Rust Axum API Server with Health Endpoint

- **Date:** 2026-09-18
- **Topic:** Basic Rust API Server Initialization
- **Framework:** Axum (v0.8 or compatible latest)
- **Runtime:** Tokio

## 1. Overview

Initialize a clean, modular Rust web API service using Axum and Tokio. The service provides a basic configuration baseline, structured tracing/logging, and a `GET /health` endpoint returning a JSON status response.

## 2. Architecture & File Structure

```text
rust_api/
├── Cargo.toml
├── src/
│   ├── main.rs          # Server bootstrap, tracing initialization, listener binding, graceful execution
│   ├── lib.rs           # Exports app router builder `create_app()` for reuse and testing
│   ├── config.rs        # App configuration: HOST (default 0.0.0.0) and PORT (default 8080)
│   └── routes/
│       ├── mod.rs       # Route module aggregator
│       └── health.rs    # GET /health handler and response models
└── tests/
    └── health_test.rs   # Integration test verifying GET /health behavior
```

## 3. Configuration

Defined in `src/config.rs`:
- `Config` struct holding:
  - `host`: `String` (from `HOST` env var, fallback `"0.0.0.0"`)
  - `port`: `u16` (from `PORT` env var, fallback `8080`)
- `Config::from_env()` loads environment variables or uses default values.
- Implements `address(&self) -> String` producing `"host:port"`.

## 4. API Endpoints

### Health Check

- **Method:** `GET`
- **Path:** `/health`
- **Response Status:** `200 OK`
- **Headers:** `Content-Type: application/json`
- **Body Schema:**
  ```json
  {
    "status": "ok"
  }
  ```
- **Handler Data Structure:**
  ```rust
  #[derive(serde::Serialize, serde::Deserialize, Debug, PartialEq, Eq)]
  pub struct HealthResponse {
      pub status: String,
  }
  ```

## 5. Middleware & Observability

- `tracing` and `tracing-subscriber` initialized in `main.rs` with `EnvFilter` defaulting to `info`.
- `tower-http` `TraceLayer` attached to the router for structured request/response logging.

## 6. Testing Strategy

- Use integration testing via `tests/health_test.rs`.
- Router tested in-process with `create_app()` using `tower::ServiceExt::oneshot`.
- Validates:
  1. `GET /health` returns status `200 OK`.
  2. Response header contains `application/json`.
  3. JSON body deserializes to `HealthResponse { status: "ok" }`.
