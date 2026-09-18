use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use rust_api::{
    create_app,
    db::init_pool,
    models::{
        author::Author,
        post::{Post, PostWithAuthor},
    },
};
use serde_json::json;
use tower::ServiceExt;

#[tokio::test]
async fn test_posts_crud_and_cascade_lifecycle() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    // 1. Initially empty posts
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let posts: Vec<PostWithAuthor> = serde_json::from_slice(&body).unwrap();
    assert!(posts.is_empty());

    // 2. Create an author first
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/authors")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({
                        "name": "Bob Builder",
                        "email": "bob@example.com"
                    }))
                    .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let author: Author = serde_json::from_slice(&body).unwrap();
    let author_id = author.id;

    // 3. Create post with non-existent author returns 400 or 404 (FK constraint or validation)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/posts")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({
                        "author_id": 999999,
                        "title": "Invalid Post",
                        "content": "Should fail due to non-existent author"
                    }))
                    .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert!(
        res.status() == StatusCode::BAD_REQUEST || res.status() == StatusCode::NOT_FOUND,
        "Expected 400 or 404, got {}",
        res.status()
    );

    // 4. Create post linked to author (201 Created)
    let new_post = json!({
        "author_id": author_id,
        "title": "First Rust Post",
        "content": "Learning Axum and SQLite"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/posts")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&new_post).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: Post = serde_json::from_slice(&body).unwrap();
    assert_eq!(created.author_id, author_id);
    assert_eq!(created.title, "First Rust Post");
    assert_eq!(created.content, "Learning Axum and SQLite");
    let post_id = created.id;

    // 5. Get post by id with author details (PostWithAuthor)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts/{}", post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let fetched: PostWithAuthor = serde_json::from_slice(&body).unwrap();
    assert_eq!(fetched.id, post_id);
    assert_eq!(fetched.author_id, author_id);
    assert_eq!(fetched.title, "First Rust Post");
    assert_eq!(fetched.content, "Learning Axum and SQLite");
    assert_eq!(fetched.author_name, "Bob Builder");
    assert_eq!(fetched.author_email, "bob@example.com");

    // 6. Get post by non-existent id returns 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts/999999")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 7. List posts with author details
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let list: Vec<PostWithAuthor> = serde_json::from_slice(&body).unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].id, post_id);
    assert_eq!(list[0].author_name, "Bob Builder");
    assert_eq!(list[0].author_email, "bob@example.com");

    // 8. Update post (200 OK)
    let update_data = json!({
        "title": "Updated Rust Post",
        "content": "Updated content with Axum and SQLite"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}", post_id))
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_data).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let updated: Post = serde_json::from_slice(&body).unwrap();
    assert_eq!(updated.id, post_id);
    assert_eq!(updated.title, "Updated Rust Post");
    assert_eq!(updated.content, "Updated content with Axum and SQLite");

    // 9. Update non-existent post returns 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/posts/999999")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_data).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 10. Delete post (204 No Content)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/posts/{}", post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    // 11. Delete non-existent post returns 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/posts/{}", post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 12. Cascade deletion test:
    // Create a new post for Bob
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/posts")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&new_post).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let cascade_post: Post = serde_json::from_slice(&body).unwrap();
    let cascade_post_id = cascade_post.id;

    // Delete author Bob
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

    // Verify Bob's post was deleted by cascade
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts/{}", cascade_post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // Verify posts list is empty
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let posts: Vec<PostWithAuthor> = serde_json::from_slice(&body).unwrap();
    assert!(posts.is_empty());
}
