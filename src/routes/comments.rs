use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};

use crate::extractors::AuthUser;
use crate::models::comment::{Comment, CommentQuery, CreateComment, UpdateComment};
use crate::models::post::PaginatedResponse;
use crate::AppState;

pub const MAX_COMMENT_LENGTH: usize = 5000;

pub async fn list_comments(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(query): Query<CommentQuery>,
) -> Result<Json<PaginatedResponse<Comment>>, StatusCode> {
    // Check if post exists
    let post_exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM posts WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to check post existence: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    if post_exists.is_none() {
        return Err(StatusCode::NOT_FOUND);
    }

    let page = query.page.unwrap_or(1).max(1);
    let limit = query.per_page.or(query.limit).unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM post_comments WHERE post_id = ?")
        .bind(id)
        .fetch_one(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to count comments: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let total_count = total.0;
    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count as f64 / limit as f64).ceil() as u32
    };

    let comments = sqlx::query_as::<_, Comment>(
        r#"
        SELECT
            c.id,
            c.post_id,
            c.author_id,
            a.name AS author_name,
            a.email AS author_email,
            c.content,
            c.created_at,
            c.updated_at
        FROM post_comments c
        JOIN authors a ON c.author_id = a.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC, c.id ASC
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch comments: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(PaginatedResponse {
        items: comments,
        total: total_count,
        page,
        limit,
        per_page: Some(limit),
        total_pages,
    }))
}

pub async fn create_comment(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    auth_user: AuthUser,
    Json(payload): Json<CreateComment>,
) -> Result<(StatusCode, Json<Comment>), (StatusCode, String)> {
    let trimmed = payload.content.trim();
    if trimmed.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Content cannot be empty".to_string(),
        ));
    }
    if trimmed.chars().count() > MAX_COMMENT_LENGTH {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Comment cannot exceed {} characters", MAX_COMMENT_LENGTH),
        ));
    }

    // Check if post exists
    let post_exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM posts WHERE id = ?")
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

    if post_exists.is_none() {
        return Err((StatusCode::NOT_FOUND, "Post not found".to_string()));
    }

    let result =
        sqlx::query("INSERT INTO post_comments (post_id, author_id, content) VALUES (?, ?, ?)")
            .bind(id)
            .bind(auth_user.id)
            .bind(trimmed)
            .execute(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to insert comment: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".to_string(),
                )
            })?;

    let comment_id = result.last_insert_rowid();

    let comment = sqlx::query_as::<_, Comment>(
        r#"
        SELECT
            c.id,
            c.post_id,
            c.author_id,
            a.name AS author_name,
            a.email AS author_email,
            c.content,
            c.created_at,
            c.updated_at
        FROM post_comments c
        JOIN authors a ON c.author_id = a.id
        WHERE c.id = ?
        "#,
    )
    .bind(comment_id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch created comment: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Database error".to_string(),
        )
    })?;

    Ok((StatusCode::CREATED, Json(comment)))
}

pub async fn update_comment(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    auth_user: AuthUser,
    Json(payload): Json<UpdateComment>,
) -> Result<Json<Comment>, (StatusCode, String)> {
    let trimmed = payload.content.trim();
    if trimmed.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Content cannot be empty".to_string(),
        ));
    }
    if trimmed.chars().count() > MAX_COMMENT_LENGTH {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Comment cannot exceed {} characters", MAX_COMMENT_LENGTH),
        ));
    }

    let comment_author: Option<(i64,)> =
        sqlx::query_as("SELECT author_id FROM post_comments WHERE id = ?")
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to check comment existence: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".to_string(),
                )
            })?;

    let comment_author_id = match comment_author {
        Some((author_id,)) => author_id,
        None => return Err((StatusCode::NOT_FOUND, "Comment not found".to_string())),
    };

    if comment_author_id != auth_user.id {
        return Err((
            StatusCode::FORBIDDEN,
            "You are not authorized to update this comment".to_string(),
        ));
    }

    sqlx::query(
        "UPDATE post_comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .bind(trimmed)
    .bind(id)
    .execute(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update comment: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Database error".to_string(),
        )
    })?;

    let comment = sqlx::query_as::<_, Comment>(
        r#"
        SELECT
            c.id,
            c.post_id,
            c.author_id,
            a.name AS author_name,
            a.email AS author_email,
            c.content,
            c.created_at,
            c.updated_at
        FROM post_comments c
        JOIN authors a ON c.author_id = a.id
        WHERE c.id = ?
        "#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch updated comment: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Database error".to_string(),
        )
    })?;

    Ok(Json(comment))
}

pub async fn delete_comment(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    auth_user: AuthUser,
) -> Result<StatusCode, (StatusCode, String)> {
    let comment_info: Option<(i64, i64)> = sqlx::query_as(
        r#"
        SELECT c.author_id, p.author_id
        FROM post_comments c
        JOIN posts p ON c.post_id = p.id
        WHERE c.id = ?
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to check comment permissions: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Database error".to_string(),
        )
    })?;

    let (comment_author_id, post_author_id) = match comment_info {
        Some(pair) => pair,
        None => return Err((StatusCode::NOT_FOUND, "Comment not found".to_string())),
    };

    if auth_user.id != comment_author_id && auth_user.id != post_author_id {
        return Err((
            StatusCode::FORBIDDEN,
            "You are not authorized to delete this comment".to_string(),
        ));
    }

    let result = sqlx::query("DELETE FROM post_comments WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete comment: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?;

    if result.rows_affected() == 0 {
        Err((StatusCode::NOT_FOUND, "Comment not found".to_string()))
    } else {
        Ok(StatusCode::NO_CONTENT)
    }
}
