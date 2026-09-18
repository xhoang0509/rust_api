pub mod config;
pub mod db;
pub mod models;
pub mod routes;

pub use models::{
    Author, CreateAuthor, CreatePost, Post, PostWithAuthor, UpdateAuthor, UpdatePost,
};

use axum::Router;
use sqlx::SqlitePool;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
}

pub fn create_app(pool: SqlitePool) -> Router {
    let state = AppState { pool };

    Router::new()
        .merge(routes::routes())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
