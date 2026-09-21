pub mod auth;
pub mod authors;
pub mod comments;
pub mod health;
pub mod posts;
pub mod reactions;

use crate::AppState;
use axum::{
    routing::{get, post, put},
    Router,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health_check))
        .route("/api/auth/register", post(auth::register))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/me", get(auth::me))
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
        .route(
            "/api/posts/{id}/reactions",
            get(reactions::get_post_reactions)
                .put(reactions::set_post_reaction)
                .delete(reactions::delete_post_reaction),
        )
        .route(
            "/api/posts/{id}/comments",
            get(comments::list_comments).post(comments::create_comment),
        )
        .route(
            "/api/comments/{id}",
            put(comments::update_comment).delete(comments::delete_comment),
        )
}
