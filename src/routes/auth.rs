use crate::auth::{generate_token, hash_password, verify_password};
use crate::extractors::AuthUser;
use crate::models::author::{AuthResponse, Author, LoginRequest, RegisterRequest};
use crate::AppState;
use axum::{extract::State, http::StatusCode, Json};

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), (StatusCode, String)> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Name cannot be empty".to_string()));
    }
    let email = payload.email.trim().to_lowercase();
    if email.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Email cannot be empty".to_string()));
    }
    if payload.password.len() < 6 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Password must be at least 6 characters".to_string(),
        ));
    }

    let password_hash = hash_password(&payload.password).map_err(|e| {
        tracing::error!("Failed to hash password: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Internal server error".to_string(),
        )
    })?;

    let result = sqlx::query("INSERT INTO authors (name, email, password_hash) VALUES (?, ?, ?)")
        .bind(name)
        .bind(&email)
        .bind(&password_hash)
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
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".to_string(),
                )
            })?;

            let token =
                generate_token(author.id, &author.email, &state.jwt_secret).map_err(|e| {
                    tracing::error!("Failed to generate token: {:?}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Internal server error".to_string(),
                    )
                })?;

            Ok((StatusCode::CREATED, Json(AuthResponse { token, author })))
        }
        Err(sqlx::Error::Database(db_err)) if db_err.is_unique_violation() => Err((
            StatusCode::BAD_REQUEST,
            "Email is already registered".to_string(),
        )),
        Err(e) => {
            tracing::error!("Failed to insert author: {:?}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            ))
        }
    }
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), (StatusCode, String)> {
    let email = payload.email.trim().to_lowercase();
    if email.is_empty() || payload.password.is_empty() {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Email and password are required".to_string(),
        ));
    }

    let record: Option<(i64, String, String, String, String)> = sqlx::query_as(
        "SELECT id, name, email, password_hash, created_at FROM authors WHERE email = ?",
    )
    .bind(&email)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to query author: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Database error".to_string(),
        )
    })?;

    let (id, name, email, password_hash, created_at) = match record {
        Some(row) => row,
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                "Account does not exist".to_string(),
            ))
        }
    };

    let is_valid = verify_password(&payload.password, &password_hash).map_err(|e| {
        tracing::error!("Password verification error: {:?}", e);
        (StatusCode::UNAUTHORIZED, "Incorrect password".to_string())
    })?;

    if !is_valid {
        return Err((StatusCode::UNAUTHORIZED, "Incorrect password".to_string()));
    }

    let token = generate_token(id, &email, &state.jwt_secret).map_err(|e| {
        tracing::error!("Failed to generate token: {:?}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Internal server error".to_string(),
        )
    })?;

    let author = Author {
        id,
        name,
        email,
        created_at,
    };

    Ok((StatusCode::OK, Json(AuthResponse { token, author })))
}

pub async fn me(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> Result<Json<Author>, (StatusCode, String)> {
    let author =
        sqlx::query_as::<_, Author>("SELECT id, name, email, created_at FROM authors WHERE id = ?")
            .bind(auth_user.id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch author: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Database error".to_string(),
                )
            })?;

    match author {
        Some(author) => Ok(Json(author)),
        None => Err((StatusCode::UNAUTHORIZED, "Unauthorized".to_string())),
    }
}
