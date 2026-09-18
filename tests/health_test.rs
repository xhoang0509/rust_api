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
