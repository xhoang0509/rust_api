use crate::models::post::{
    CreatePost, PaginatedResponse, Post, PostQuery, PostWithAuthor, UpdatePost,
};
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};

pub async fn list_posts(
    State(state): State<AppState>,
    Query(query): Query<PostQuery>,
) -> Result<Json<PaginatedResponse<PostWithAuthor>>, StatusCode> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * limit;

    let mut count_builder = sqlx::QueryBuilder::new("SELECT COUNT(*) FROM posts p");
    let mut data_builder = sqlx::QueryBuilder::new(
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
        "#,
    );

    // Apply filters
    let mut has_where = false;

    if let Some(author_id) = query.author_id {
        count_builder.push(" WHERE p.author_id = ");
        count_builder.push_bind(author_id);

        data_builder.push(" WHERE p.author_id = ");
        data_builder.push_bind(author_id);

        has_where = true;
    }

    if let Some(ref search) = query.search {
        let pattern = format!("%{}%", search);
        let prefix = if has_where { " AND " } else { " WHERE " };

        count_builder.push(prefix);
        count_builder.push("(p.title LIKE ");
        count_builder.push_bind(pattern.clone());
        count_builder.push(" OR p.content LIKE ");
        count_builder.push_bind(pattern.clone());
        count_builder.push(")");

        data_builder.push(prefix);
        data_builder.push("(p.title LIKE ");
        data_builder.push_bind(pattern.clone());
        data_builder.push(" OR p.content LIKE ");
        data_builder.push_bind(pattern);
        data_builder.push(")");
    }

    let total: (i64,) = count_builder
        .build_query_as()
        .fetch_one(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to count posts: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let total_count = total.0;
    let total_pages = if total_count == 0 {
        0
    } else {
        (total_count as f64 / limit as f64).ceil() as u32
    };

    data_builder.push(" ORDER BY p.id ASC LIMIT ");
    data_builder.push_bind(limit);
    data_builder.push(" OFFSET ");
    data_builder.push_bind(offset);

    let posts = data_builder
        .build_query_as::<PostWithAuthor>()
        .fetch_all(&state.pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch posts: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(PaginatedResponse {
        items: posts,
        total: total_count,
        page,
        limit,
        total_pages,
    }))
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
