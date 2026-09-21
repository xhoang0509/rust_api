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
    let app = create_app_with_secret(pool.clone(), jwt_secret.clone());

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
    let body = res.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        String::from_utf8_lossy(&body),
        "Email is already registered"
    );

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
    let body = res.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(String::from_utf8_lossy(&body), "Incorrect password");

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
    let body = res.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(String::from_utf8_lossy(&body), "Account does not exist");

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

    // 9. Call /api/auth/me with lowercase "bearer " header prefix -> 200 OK
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/auth/me")
                .header("authorization", format!("bearer {}", initial_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);

    // 10. Call /api/auth/me with empty bearer token -> 401 Unauthorized
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/auth/me")
                .header("authorization", "Bearer ")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 11. Register with empty fields -> 400 Bad Request
    let empty_name_payload = json!({
        "name": "   ",
        "email": "valid@example.com",
        "password": "password123"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&empty_name_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 12. Login with empty credentials -> 401 Unauthorized
    let empty_login_payload = json!({
        "email": "",
        "password": ""
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&empty_login_payload).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        String::from_utf8_lossy(&body),
        "Email and password are required"
    );

    // 13. Call /api/auth/me with expired token -> 401 Unauthorized (Scenario 6)
    let expired_claims = rust_api::Claims {
        sub: auth_resp.author.id.to_string(),
        email: auth_resp.author.email.clone(),
        exp: 1000, // expired in 1970
    };
    let expired_token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &expired_claims,
        &jsonwebtoken::EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .unwrap();

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/auth/me")
                .header("authorization", format!("Bearer {}", expired_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 14. Call /api/auth/me with token signed by different secret -> 401 Unauthorized
    let foreign_token = rust_api::generate_token(
        auth_resp.author.id,
        &auth_resp.author.email,
        "foreign-secret-key-at-least-32-bytes-long",
    )
    .unwrap();

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/auth/me")
                .header("authorization", format!("Bearer {}", foreign_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 15. Call /api/auth/me with non-Bearer auth scheme (e.g. Basic) -> 401 Unauthorized
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/auth/me")
                .header("authorization", "Basic dXNlcjpwYXNz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 16. Call /api/auth/me after author is deleted from database -> 401 Unauthorized
    sqlx::query("DELETE FROM authors WHERE id = ?")
        .bind(auth_resp.author.id)
        .execute(&pool)
        .await
        .unwrap();

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
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 17. Call /api/auth/me with multibyte UTF-8 characters without panic -> 401 Unauthorized
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/auth/me")
                .header("authorization", "Bearer \u{1F511}token")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // Multibyte string where byte 7 falls inside a multibyte char
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/auth/me")
                .header("authorization", "\u{1F600}\u{1F600}")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 18. Register with short password (< 6 chars) -> 400 Bad Request
    let short_pw_payload = json!({
        "name": "Short Password",
        "email": "short@example.com",
        "password": "12345"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&short_pw_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        String::from_utf8_lossy(&body),
        "Password must be at least 6 characters"
    );

    // 19. Register with untrimmed name and mixed case email -> normalized
    let unnormalized_payload = json!({
        "name": "   Normalized User   ",
        "email": "   User.Normal@Example.COM   ",
        "password": "valid-password-123"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&unnormalized_payload).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let norm_resp: AuthResponse = serde_json::from_slice(&body).unwrap();
    assert_eq!(norm_resp.author.name, "Normalized User");
    assert_eq!(norm_resp.author.email, "user.normal@example.com");

    // Login with unnormalized email
    let login_unnorm_payload = json!({
        "email": "  USER.NORMAL@EXAMPLE.COM  ",
        "password": "valid-password-123"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&login_unnorm_payload).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}
