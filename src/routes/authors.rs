use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use crate::models::author::{Author, CreateAuthor, UpdateAuthor};
use crate::AppState;

pub async fn list_authors(
    State(state): State<AppState>,
) -> Result<Json<Vec<Author>>, StatusCode> {
    let authors = sqlx::query_as::<_, Author>(
        "SELECT id, name, email, created_at FROM authors ORDER BY id ASC",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch authors: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(authors))
}

pub async fn create_author(
    State(state): State<AppState>,
    Json(payload): Json<CreateAuthor>,
) -> Result<(StatusCode, Json<Author>), (StatusCode, String)> {
    let result = sqlx::query(
        "INSERT INTO authors (name, email) VALUES (?, ?)",
    )
    .bind(&payload.name)
    .bind(&payload.email)
    .execute(&state.pool)
    .await;

    match result {
        Ok(res) => {
            let id = res.last_insert_rowid();
            let author = sqlx::query_as::<_, Author>(
                "SELECT id, name, email, created_at FROM authors WHERE id = ?",
            )
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch created author: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
            })?;

            Ok((StatusCode::CREATED, Json(author)))
        }
        Err(sqlx::Error::Database(db_err)) if db_err.is_unique_violation() => {
            Err((StatusCode::BAD_REQUEST, "Email already exists".to_string()))
        }
        Err(e) => {
            tracing::error!("Failed to insert author: {:?}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string()))
        }
    }
}

pub async fn get_author(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Author>, StatusCode> {
    let author = sqlx::query_as::<_, Author>(
        "SELECT id, name, email, created_at FROM authors WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch author: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match author {
        Some(author) => Ok(Json(author)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn update_author(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateAuthor>,
) -> Result<Json<Author>, (StatusCode, String)> {
    // Check if author exists first
    let exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM authors WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to check author existence: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
        })?;

    if exists.is_none() {
        return Err((StatusCode::NOT_FOUND, "Author not found".to_string()));
    }

    let result = sqlx::query(
        "UPDATE authors SET name = ?, email = ? WHERE id = ?",
    )
    .bind(&payload.name)
    .bind(&payload.email)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            let author = sqlx::query_as::<_, Author>(
                "SELECT id, name, email, created_at FROM authors WHERE id = ?",
            )
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch updated author: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
            })?;

            Ok(Json(author))
        }
        Err(sqlx::Error::Database(db_err)) if db_err.is_unique_violation() => {
            Err((StatusCode::BAD_REQUEST, "Email already exists".to_string()))
        }
        Err(e) => {
            tracing::error!("Failed to update author: {:?}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string()))
        }
    }
}

pub async fn delete_author(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    let result = sqlx::query("DELETE FROM authors WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete author: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    if result.rows_affected() == 0 {
        Err(StatusCode::NOT_FOUND)
    } else {
        Ok(StatusCode::NO_CONTENT)
    }
}
