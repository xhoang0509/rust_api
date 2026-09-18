pub mod config;
pub mod db;
pub mod routes;

use axum::Router;
use tower_http::trace::TraceLayer;

pub fn create_app() -> Router {
    Router::new()
        .merge(routes::routes())
        .layer(TraceLayer::new_for_http())
}
