pub mod authors;
pub mod health;

use axum::{routing::get, Router};
use crate::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health_check))
        .route("/api/authors", get(authors::list_authors).post(authors::create_author))
        .route(
            "/api/authors/{id}",
            get(authors::get_author)
                .put(authors::update_author)
                .delete(authors::delete_author),
        )
}
