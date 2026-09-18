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

```bash
cargo run
```

Specify custom host or port:
```bash
PORT=3000 HOST=127.0.0.1 cargo run
```

### Running Tests

```bash
cargo test
```

### Running with Docker

Build the Docker image:
```bash
docker build -t rust_api .
```

Run the container:
```bash
docker run -p 8080:8080 rust_api
```

### Health Check Endpoint

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok"
}
```
