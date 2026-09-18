use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use rust_api::{create_app_with_secret, db::init_pool, models::author::Author, AuthResponse};
use serde_json::json;
use tower::ServiceExt;

#[tokio::test]
async fn test_auth_lifecycle() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let jwt_secret = "test-jwt-secret-key-at-least-32-bytes-long".to_string();
    let app = create_app_with_secret(pool, jwt_secret);

    // 1. Register new user -> 201 Created with AuthResponse (token + author)
    let register_payload = json!({
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "secure-password-123"
    });

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&register_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let auth_resp: AuthResponse = serde_json::from_slice(&body).unwrap();
    assert!(!auth_resp.token.is_empty());
    assert_eq!(auth_resp.author.name, "Jane Doe");
    assert_eq!(auth_resp.author.email, "jane@example.com");
    let initial_token = auth_resp.token;

    // 2. Register with duplicate email -> 400 Bad Request
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&register_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 3. Login with correct credentials -> 200 OK with AuthResponse
    let login_payload = json!({
        "email": "jane@example.com",
        "password": "secure-password-123"
    });

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&login_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let login_resp: AuthResponse = serde_json::from_slice(&body).unwrap();
    assert!(!login_resp.token.is_empty());
    assert_eq!(login_resp.author.name, "Jane Doe");
    assert_eq!(login_resp.author.email, "jane@example.com");

    // 4. Login with wrong password -> 401 Unauthorized
    let wrong_pw_payload = json!({
        "email": "jane@example.com",
        "password": "wrong-password"
    });

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&wrong_pw_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 5. Login with non-existent email -> 401 Unauthorized
    let non_existent_payload = json!({
        "email": "nobody@example.com",
        "password": "secure-password-123"
    });

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&non_existent_payload).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 6. Call /api/auth/me with valid token -> 200 OK with Author
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/auth/me")
                .header("authorization", format!("Bearer {}", initial_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let me_author: Author = serde_json::from_slice(&body).unwrap();
    assert_eq!(me_author.name, "Jane Doe");
    assert_eq!(me_author.email, "jane@example.com");

    // 7. Call /api/auth/me with invalid token -> 401 Unauthorized
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/auth/me")
                .header("authorization", "Bearer invalid-jwt-token-string")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 8. Call /api/auth/me without authorization header -> 401 Unauthorized
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/auth/me")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}
