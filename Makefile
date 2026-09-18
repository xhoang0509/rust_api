.PHONY: help dev dev-backend dev-frontend build test clean

help: ## Display documented targets
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

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
