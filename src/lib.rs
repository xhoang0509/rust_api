pub mod auth;
pub mod config;
pub mod db;
pub mod extractors;
pub mod models;
pub mod routes;

pub use auth::{generate_token, hash_password, verify_password, verify_token, Claims};
pub use extractors::AuthUser;
pub use models::{
    AuthResponse, Author, CreateAuthor, CreatePost, LoginRequest, PaginatedResponse, Post,
    PostQuery, PostWithAuthor, RegisterRequest, UpdateAuthor, UpdatePost,
};

use axum::Router;
use sqlx::SqlitePool;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub jwt_secret: String,
}

pub fn create_app(pool: SqlitePool) -> Router {
    create_app_with_secret(pool, "dev-secret-key-at-least-32-bytes-long".to_string())
}

pub fn create_app_with_secret(pool: SqlitePool, jwt_secret: String) -> Router {
    let state = AppState { pool, jwt_secret };

    Router::new()
        .merge(routes::routes())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
