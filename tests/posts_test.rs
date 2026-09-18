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
    let res_envelope: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert!(res_envelope.items.is_empty());
    assert_eq!(res_envelope.total, 0);
    assert_eq!(res_envelope.page, 1);
    assert_eq!(res_envelope.limit, 10);
    assert_eq!(res_envelope.total_pages, 0);

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
    let list_envelope: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert_eq!(list_envelope.items.len(), 1);
    assert_eq!(list_envelope.total, 1);
    assert_eq!(list_envelope.page, 1);
    assert_eq!(list_envelope.limit, 10);
    assert_eq!(list_envelope.total_pages, 1);
    assert_eq!(list_envelope.items[0].id, post_id);
    assert_eq!(list_envelope.items[0].author_name, "Bob Builder");
    assert_eq!(list_envelope.items[0].author_email, "bob@example.com");

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
    let posts_envelope: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert!(posts_envelope.items.is_empty());
    assert_eq!(posts_envelope.total, 0);
}

#[tokio::test]
async fn test_posts_pagination_search_and_filter() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    // Create two authors: Alice and Bob
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/authors")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({
                        "name": "Alice Author",
                        "email": "alice@example.com"
                    }))
                    .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let author_a: Author = serde_json::from_slice(&body).unwrap();

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/authors")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({
                        "name": "Bob Author",
                        "email": "bob@example.com"
                    }))
                    .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let author_b: Author = serde_json::from_slice(&body).unwrap();

    // Create 5 posts:
    // Post 1: Alice - "Rust Basics" - "Learn memory management"
    // Post 2: Alice - "Axum Web Framework" - "Routing and handlers"
    // Post 3: Alice - "SQLx Database" - "Compile time verification"
    // Post 4: Bob - "Frontend React" - "Modern UI with hooks"
    // Post 5: Bob - "Rust Concurrency" - "Async await and Tokio"
    let posts_data = vec![
        (author_a.id, "Rust Basics", "Learn memory management"),
        (author_a.id, "Axum Web Framework", "Routing and handlers"),
        (author_a.id, "SQLx Database", "Compile time verification"),
        (author_b.id, "Frontend React", "Modern UI with hooks"),
        (author_b.id, "Rust Concurrency", "Async await and Tokio"),
    ];

    for (a_id, title, content) in posts_data {
        let _ = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/posts")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "author_id": a_id,
                            "title": title,
                            "content": content
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
    }

    // 1. Test pagination default (page=1, limit=10)
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
    let resp: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert_eq!(resp.total, 5);
    assert_eq!(resp.page, 1);
    assert_eq!(resp.limit, 10);
    assert_eq!(resp.total_pages, 1);
    assert_eq!(resp.items.len(), 5);

    // 2. Test pagination limit and page (page=1, limit=2)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts?page=1&limit=2")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let resp: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert_eq!(resp.total, 5);
    assert_eq!(resp.page, 1);
    assert_eq!(resp.limit, 2);
    assert_eq!(resp.total_pages, 3);
    assert_eq!(resp.items.len(), 2);
    assert_eq!(resp.items[0].title, "Rust Basics");
    assert_eq!(resp.items[1].title, "Axum Web Framework");

    // 3. Test page 2 with limit 2
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts?page=2&limit=2")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let resp: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert_eq!(resp.total, 5);
    assert_eq!(resp.page, 2);
    assert_eq!(resp.limit, 2);
    assert_eq!(resp.total_pages, 3);
    assert_eq!(resp.items.len(), 2);
    assert_eq!(resp.items[0].title, "SQLx Database");
    assert_eq!(resp.items[1].title, "Frontend React");

    // 4. Test page 3 with limit 2
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts?page=3&limit=2")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let resp: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert_eq!(resp.total, 5);
    assert_eq!(resp.page, 3);
    assert_eq!(resp.limit, 2);
    assert_eq!(resp.total_pages, 3);
    assert_eq!(resp.items.len(), 1);
    assert_eq!(resp.items[0].title, "Rust Concurrency");

    // 5. Test search filtering by title substring ("Rust")
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts?search=Rust")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let resp: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert_eq!(resp.total, 2); // "Rust Basics", "Rust Concurrency"
    assert_eq!(resp.items.len(), 2);
    assert_eq!(resp.items[0].title, "Rust Basics");
    assert_eq!(resp.items[1].title, "Rust Concurrency");

    // 6. Test search filtering by content substring ("Tokio")
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts?search=Tokio")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let resp: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert_eq!(resp.total, 1);
    assert_eq!(resp.items.len(), 1);
    assert_eq!(resp.items[0].title, "Rust Concurrency");

    // 7. Test author_id filtering (Bob's posts only)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts?author_id={}", author_b.id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let resp: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert_eq!(resp.total, 2);
    assert_eq!(resp.items.len(), 2);
    assert!(resp.items.iter().all(|p| p.author_id == author_b.id));

    // 8. Test combining author_id and search filter
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts?author_id={}&search=Rust", author_a.id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let resp: rust_api::models::post::PaginatedResponse<PostWithAuthor> =
        serde_json::from_slice(&body).unwrap();
    assert_eq!(resp.total, 1);
    assert_eq!(resp.items.len(), 1);
    assert_eq!(resp.items[0].title, "Rust Basics");
}
