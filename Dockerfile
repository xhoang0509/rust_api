# --- Stage 1: Build binary ---
FROM rust:1.85-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependency builds by copying manifests first
COPY Cargo.toml Cargo.lock ./

# Create dummy source tree to build and cache dependencies
RUN mkdir -p src && \
    echo "fn main() {}" > src/main.rs && \
    touch src/lib.rs && \
    cargo build --release && \
    rm -rf src

# Copy real source code
COPY src ./src

# Update timestamps to ensure cargo detects changes and build the final release binary
RUN touch src/main.rs src/lib.rs && \
    cargo build --release --bin rust_api

# --- Stage 2: Runtime image ---
FROM debian:bookworm-slim AS runtime

WORKDIR /app

# Install ca-certificates and curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user
RUN useradd -m -u 10001 -U -s /bin/sh appuser

# Copy binary from builder
COPY --from=builder /app/target/release/rust_api /app/rust_api

# Change ownership to non-root user
USER appuser

# Expose default API server port
EXPOSE 8080

ENV HOST=0.0.0.0
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/rust_api"]
