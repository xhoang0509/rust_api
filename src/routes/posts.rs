use crate::models::post::{CreatePost, Post, PostWithAuthor, UpdatePost};
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};

pub async fn list_posts(
    State(state): State<AppState>,
) -> Result<Json<Vec<PostWithAuthor>>, StatusCode> {
    let posts = sqlx::query_as::<_, PostWithAuthor>(
        r#"
        SELECT
            p.id,
            p.author_id,
            p.title,
            p.content,
            p.created_at,
            p.updated_at,
            a.name AS author_name,
            a.email AS author_email
        FROM posts p
        JOIN authors a ON p.author_id = a.id
        ORDER BY p.id ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch posts: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(posts))
}

pub async fn create_post(
    State(state): State<AppState>,
    Json(payload): Json<CreatePost>,
) -> Result<(StatusCode, Json<Post>), (StatusCode, String)> {
    // Check if author exists to provide a friendly 400 Bad Request if missing
    let author_exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM authors WHERE id = ?")
        .bind(payload.author_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to check author existence: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?;

    if author_exists.is_none() {
        return Err((StatusCode::BAD_REQUEST, "Author not found".to_string()));
    }

    let result = sqlx::query("INSERT INTO posts (author_id, title, content) VALUES (?, ?, ?)")
        .bind(payload.author_id)
        .bind(&payload.title)
        .bind(&payload.content)
        .execute(&state.pool)
        .await;

    match result {
        Ok(res) => {
            let id = res.last_insert_rowid();
            let post = sqlx::query_as::<_, Post>(
                "SELECT id, author_id, title, content, created_at, updated_at FROM posts WHERE id = ?",
            )
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch created post: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
            })?;

            Ok((StatusCode::CREATED, Json(post)))
        }
        Err(e) => {
            tracing::error!("Failed to insert post: {:?}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            ))
        }
    }
}

pub async fn get_post(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<PostWithAuthor>, StatusCode> {
    let post = sqlx::query_as::<_, PostWithAuthor>(
        r#"
        SELECT
            p.id,
            p.author_id,
            p.title,
            p.content,
            p.created_at,
            p.updated_at,
            a.name AS author_name,
            a.email AS author_email
        FROM posts p
        JOIN authors a ON p.author_id = a.id
        WHERE p.id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch post: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match post {
        Some(post) => Ok(Json(post)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn update_post(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdatePost>,
) -> Result<Json<Post>, (StatusCode, String)> {
    // Check if post exists first
    let exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM posts WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to check post existence: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?;

    if exists.is_none() {
        return Err((StatusCode::NOT_FOUND, "Post not found".to_string()));
    }

    let result = sqlx::query(
        "UPDATE posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(&payload.title)
    .bind(&payload.content)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            let post = sqlx::query_as::<_, Post>(
                "SELECT id, author_id, title, content, created_at, updated_at FROM posts WHERE id = ?",
            )
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch updated post: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
            })?;

            Ok(Json(post))
        }
        Err(e) => {
            tracing::error!("Failed to update post: {:?}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            ))
        }
    }
}

pub async fn delete_post(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    let result = sqlx::query("DELETE FROM posts WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete post: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    if result.rows_affected() == 0 {
        Err(StatusCode::NOT_FOUND)
    } else {
        Ok(StatusCode::NO_CONTENT)
    }
}
