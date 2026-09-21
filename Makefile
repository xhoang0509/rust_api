.PHONY: help dev dev-backend dev-frontend build test format lint clean docker-up docker-down docker-logs bump-patch bump-minor bump-major

help: ## Display documented targets
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

format: ## Format code (Rust & Frontend)
	cargo fmt
	npx prettier --write "frontend/src/**/*.{ts,tsx,css,json}"

lint: ## Run format and lint checks (clippy & frontend typecheck)
	cargo fmt --check
	cargo clippy --all-targets -- -D warnings
	cd frontend && npm run build

dev: ## Run backend and frontend concurrently
	npx --yes concurrently -k -p "[{name}]" -n "backend,frontend" -c "cyan,magenta" "cargo run" "cd frontend && npm run dev"

dev-backend: ## Run backend server
	cargo run

dev-frontend: ## Run frontend development server
	cd frontend && npm run dev

build: ## Build backend and frontend
	cd frontend && npm run build
	cargo build --release

test: ## Run backend tests and frontend checks
	cargo test
	cd frontend && npm run build

clean: ## Clean build artifacts
	cargo clean
	rm -rf frontend/dist

docker-up: ## Build and start Docker containers in detached mode
	docker compose up -d --build

docker-down: ## Stop and remove Docker containers
	docker compose down

docker-logs: ## View live Docker container logs
	docker compose logs -f

bump-patch: ## Bump patch version (e.g. 0.1.0 -> 0.1.1) and update changelog
	./scripts/bump-version.sh patch

bump-minor: ## Bump minor version (e.g. 0.1.0 -> 0.2.0) and update changelog
	./scripts/bump-version.sh minor

bump-major: ## Bump major version (e.g. 0.2.0 -> 1.0.0) and update changelog
	./scripts/bump-version.sh major

