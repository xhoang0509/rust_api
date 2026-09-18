use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use rust_api::{create_app, db::init_pool, routes::health::HealthResponse};
use tower::ServiceExt;

#[tokio::test]
async fn test_health_check_returns_200_and_status_ok() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get("content-type").unwrap(),
        "application/json"
    );

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body: HealthResponse = serde_json::from_slice(&body).unwrap();

    assert_eq!(
        body,
        HealthResponse {
            status: "ok".to_string()
        }
    );
}

#[tokio::test]
async fn test_static_assets_and_spa_fallback() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    // Root route should return 200 OK and text/html
    let response = app
        .clone()
        .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let content_type = response
        .headers()
        .get("content-type")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(content_type.starts_with("text/html"));
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let html = String::from_utf8_lossy(&body);
    assert!(html.contains("<!doctype html>") || html.contains("<html"));

    // Unknown client route should return 200 OK (SPA fallback) and text/html
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/unknown-client-route")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let content_type = response
        .headers()
        .get("content-type")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(content_type.starts_with("text/html"));

    // Health and API routes should still function normally
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
