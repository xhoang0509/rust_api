use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sqlx::SqlitePool;

use crate::extractors::{AuthUser, OptionalAuthUser};
use crate::models::reaction::{
    PostReactionsResponse, ReactionBreakdown, ReactionSummary, ReactionType, ReactorItem,
    SetReactionRequest,
};
use crate::AppState;

pub async fn fetch_reaction_breakdown_and_total(
    pool: &SqlitePool,
    post_id: i64,
) -> Result<(ReactionBreakdown, i64), sqlx::Error> {
    let rows: Vec<(String, i64)> = sqlx::query_as(
        "SELECT reaction_type, COUNT(*) FROM post_reactions WHERE post_id = ? GROUP BY reaction_type",
    )
    .bind(post_id)
    .fetch_all(pool)
    .await?;

    let mut breakdown = ReactionBreakdown::default();
    let mut total = 0i64;
    for (rtype, count) in rows {
        match rtype.as_str() {
            "like" => breakdown.like = count,
            "love" => breakdown.love = count,
            "haha" => breakdown.haha = count,
            "wow" => breakdown.wow = count,
            "sad" => breakdown.sad = count,
            "angry" => breakdown.angry = count,
            _ => {}
        }
        total += count;
    }

    Ok((breakdown, total))
}

pub async fn fetch_user_reaction(
    pool: &SqlitePool,
    post_id: i64,
    author_id: i64,
) -> Result<Option<String>, sqlx::Error> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT reaction_type FROM post_reactions WHERE post_id = ? AND author_id = ?",
    )
    .bind(post_id)
    .bind(author_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|(r,)| r))
}

pub async fn get_post_reactions(
    State(state): State<AppState>,
    opt_user: OptionalAuthUser,
    Path(id): Path<i64>,
) -> Result<Json<PostReactionsResponse>, StatusCode> {
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

    let (breakdown, total) = fetch_reaction_breakdown_and_total(&state.pool, id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch reaction breakdown: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let user_reaction = match opt_user.0 {
        Some(user) => fetch_user_reaction(&state.pool, id, user.id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch user reaction: {:?}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?,
        None => None,
    };

    let items = sqlx::query_as::<_, ReactorItem>(
        r#"
        SELECT
            pr.id,
            pr.post_id,
            pr.author_id,
            a.name AS author_name,
            a.email AS author_email,
            pr.reaction_type,
            pr.created_at
        FROM post_reactions pr
        JOIN authors a ON pr.author_id = a.id
        WHERE pr.post_id = ?
        ORDER BY pr.created_at DESC, pr.id DESC
        "#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch reactor items: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(PostReactionsResponse {
        total,
        reactions_count: total,
        breakdown,
        user_reaction,
        reactions: items.clone(),
        items,
    }))
}

pub async fn set_post_reaction(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<i64>,
    Json(payload): Json<SetReactionRequest>,
) -> Result<Json<ReactionSummary>, (StatusCode, String)> {
    let valid_type = ReactionType::parse(&payload.reaction_type).ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            "Invalid reaction type. Must be one of: like, love, haha, wow, sad, angry".to_string(),
        )
    })?;
    let reaction_str = valid_type.as_str();

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

    // Check existing reaction
    let existing_reaction: Option<(String,)> = sqlx::query_as(
        "SELECT reaction_type FROM post_reactions WHERE post_id = ? AND author_id = ?",
    )
    .bind(id)
    .bind(auth_user.id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to query existing reaction: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Database error".to_string(),
        )
    })?;

    match existing_reaction {
        Some((ref current_type,)) if current_type == reaction_str => {
            // Same reaction: toggle off (delete)
            sqlx::query("DELETE FROM post_reactions WHERE post_id = ? AND author_id = ?")
                .bind(id)
                .bind(auth_user.id)
                .execute(&state.pool)
                .await
                .map_err(|e| {
                    tracing::error!("Failed to delete toggled reaction: {:?}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Database error".to_string(),
                    )
                })?;
        }
        Some(_) => {
            // Different reaction: update
            sqlx::query(
                "UPDATE post_reactions SET reaction_type = ?, updated_at = CURRENT_TIMESTAMP WHERE post_id = ? AND author_id = ?",
            )
            .bind(reaction_str)
            .bind(id)
            .bind(auth_user.id)
            .execute(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to update reaction: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".to_string(),
                )
            })?;
        }
        None => {
            // No existing reaction: insert
            sqlx::query(
                "INSERT INTO post_reactions (post_id, author_id, reaction_type) VALUES (?, ?, ?)",
            )
            .bind(id)
            .bind(auth_user.id)
            .bind(reaction_str)
            .execute(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to insert reaction: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".to_string(),
                )
            })?;
        }
    }

    let (breakdown, total) = fetch_reaction_breakdown_and_total(&state.pool, id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch updated breakdown: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?;

    let user_reaction = fetch_user_reaction(&state.pool, id, auth_user.id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch user reaction: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?;

    Ok(Json(ReactionSummary {
        total,
        reactions_count: total,
        breakdown,
        user_reaction,
    }))
}

pub async fn delete_post_reaction(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Path(id): Path<i64>,
) -> Result<Json<ReactionSummary>, (StatusCode, String)> {
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

    sqlx::query("DELETE FROM post_reactions WHERE post_id = ? AND author_id = ?")
        .bind(id)
        .bind(auth_user.id)
        .execute(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete reaction: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?;

    let (breakdown, total) = fetch_reaction_breakdown_and_total(&state.pool, id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch reaction breakdown: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?;

    Ok(Json(ReactionSummary {
        total,
        reactions_count: total,
        breakdown,
        user_reaction: None,
    }))
}
