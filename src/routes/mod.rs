pub mod authors;
pub mod health;
pub mod posts;

use crate::AppState;
use axum::{routing::get, Router};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health_check))
        .route(
            "/api/authors",
            get(authors::list_authors).post(authors::create_author),
        )
        .route(
            "/api/authors/{id}",
            get(authors::get_author)
                .put(authors::update_author)
                .delete(authors::delete_author),
        )
        .route(
            "/api/posts",
            get(posts::list_posts).post(posts::create_post),
        )
        .route(
            "/api/posts/{id}",
            get(posts::get_post)
                .put(posts::update_post)
                .delete(posts::delete_post),
        )
}
