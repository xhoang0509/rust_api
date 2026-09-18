use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use rust_api::{
    create_app,
    db::init_pool,
    models::author::Author,
};
use serde_json::json;
use tower::ServiceExt;

#[tokio::test]
async fn test_author_crud_lifecycle() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    // 1. List authors (initially empty)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/authors")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let authors: Vec<Author> = serde_json::from_slice(&body).unwrap();
    assert!(authors.is_empty());

    // 2. Create author
    let new_author = json!({
        "name": "Alice Wonderland",
        "email": "alice@example.com"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/authors")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&new_author).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: Author = serde_json::from_slice(&body).unwrap();
    assert_eq!(created.name, "Alice Wonderland");
    assert_eq!(created.email, "alice@example.com");
    let author_id = created.id;

    // 3. Duplicate email returns 400 Bad Request
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/authors")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&new_author).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 4. Get author by id
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/authors/{}", author_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let fetched: Author = serde_json::from_slice(&body).unwrap();
    assert_eq!(fetched.id, author_id);
    assert_eq!(fetched.name, "Alice Wonderland");

    // 5. Get author not found returns 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/authors/999999")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 6. Update author
    let update_data = json!({
        "name": "Alice Liddell",
        "email": "alice.liddell@example.com"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/authors/{}", author_id))
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_data).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let updated: Author = serde_json::from_slice(&body).unwrap();
    assert_eq!(updated.id, author_id);
    assert_eq!(updated.name, "Alice Liddell");
    assert_eq!(updated.email, "alice.liddell@example.com");

    // 7. Update non-existent author returns 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/authors/999999")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_data).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 8. Delete author
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/authors/{}", author_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    // 9. Delete non-existent author returns 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/authors/{}", author_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}
