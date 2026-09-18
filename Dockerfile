# --- Stage 1: Build frontend assets ---
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source and build production assets
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Rust binary ---
FROM rust:bookworm AS builder

WORKDIR /app

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependency builds by copying manifests first
COPY Cargo.toml Cargo.lock ./

# Create dummy source tree and dummy frontend/dist to build and cache dependencies
RUN mkdir -p src frontend/dist && \
    touch frontend/dist/index.html && \
    echo "fn main() {}" > src/main.rs && \
    touch src/lib.rs && \
    cargo build --release && \
    rm -rf src frontend/dist

# Copy real frontend build artifacts for rust-embed
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy real source code and migrations for compile-time macros
COPY migrations ./migrations
COPY src ./src

# Update timestamps to ensure cargo detects changes and build the final release binary
RUN touch src/main.rs src/lib.rs && \
    cargo build --release --bin rust_api

# --- Stage 3: Runtime image ---
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install ca-certificates and curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user
RUN useradd -m -u 10001 -U -s /bin/sh appuser

# Create persistent data directory and assign ownership to appuser
RUN mkdir -p /data && chown -R appuser:appuser /data

# Copy binary from builder
COPY --from=builder /app/target/release/rust_api /app/rust_api

# Expose default API server port
EXPOSE 8080

# Environment variables
ENV HOST=0.0.0.0
ENV PORT=8080
ENV DATABASE_URL=sqlite:///data/rust_api.db?mode=rwc

# Persistent volume
VOLUME ["/data"]

# Switch to non-root user
USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/rust_api"]
