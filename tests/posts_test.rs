use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use rust_api::{
    create_app,
    db::init_pool,
    models::post::{Post, PostWithAuthor},
    AuthResponse,
};
use serde_json::json;
use tower::ServiceExt;

#[tokio::test]
async fn test_posts_crud_ownership_and_cascade() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    // 1. Initially empty posts (public endpoint)
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

    // 2. Register Author A and Author B
    let res_a = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({
                        "name": "Author A",
                        "email": "author_a@example.com",
                        "password": "password123"
                    }))
                    .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_a.status(), StatusCode::CREATED);
    let auth_a: AuthResponse =
        serde_json::from_slice(&res_a.into_body().collect().await.unwrap().to_bytes()).unwrap();
    let token_a = auth_a.token;
    let author_a_id = auth_a.author.id;

    let res_b = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({
                        "name": "Author B",
                        "email": "author_b@example.com",
                        "password": "password123"
                    }))
                    .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res_b.status(), StatusCode::CREATED);
    let auth_b: AuthResponse =
        serde_json::from_slice(&res_b.into_body().collect().await.unwrap().to_bytes()).unwrap();
    let token_b = auth_b.token;

    // 3. Attempting to create post without token returns 401 Unauthorized
    let post_payload = json!({
        "author_id": author_a_id, // Even if supplied, will be ignored/overridden by auth_user
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
                .body(Body::from(serde_json::to_vec(&post_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // Attempting to create post with invalid token returns 401 Unauthorized
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/posts")
                .header("content-type", "application/json")
                .header("authorization", "Bearer invalid-jwt-token")
                .body(Body::from(serde_json::to_vec(&post_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 4. Author A creates post with valid token (201 Created), author_id equals Author A's id
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/posts")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(serde_json::to_vec(&post_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let created: Post = serde_json::from_slice(&body).unwrap();
    assert_eq!(created.author_id, author_a_id);
    assert_eq!(created.title, "First Rust Post");
    assert_eq!(created.content, "Learning Axum and SQLite");
    let post_id = created.id;

    // 5. Get post by id (public route) with author details
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
    let fetched: PostWithAuthor =
        serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(fetched.id, post_id);
    assert_eq!(fetched.author_id, author_a_id);
    assert_eq!(fetched.author_name, "Author A");
    assert_eq!(fetched.author_email, "author_a@example.com");

    // 6. Mutating without token returns 401 Unauthorized
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
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

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
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 7. Author B attempting to update or delete Author A's post returns 403 Forbidden
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::from(serde_json::to_vec(&update_data).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/posts/{}", post_id))
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // 8. Author A successfully updates their own post (200 OK)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(serde_json::to_vec(&update_data).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let updated: Post =
        serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(updated.id, post_id);
    assert_eq!(updated.title, "Updated Rust Post");
    assert_eq!(updated.content, "Updated content with Axum and SQLite");

    // 9. Author A attempts to update non-existent post returns 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/posts/999999")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(serde_json::to_vec(&update_data).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 10. Author A successfully deletes their own post (204 No Content)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/posts/{}", post_id))
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    // 11. Author A attempts to delete non-existent post returns 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/posts/{}", post_id))
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 12. Cascade deletion test:
    // Author A creates a new post
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/posts")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(serde_json::to_vec(&post_payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let cascade_post: Post =
        serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
    let cascade_post_id = cascade_post.id;

    // Delete author A
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/authors/{}", author_a_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    // Verify post was deleted by cascade
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
}

#[tokio::test]
async fn test_posts_pagination_search_and_filter() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    // Register two authors: Alice and Bob
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({
                        "name": "Alice Author",
                        "email": "alice@example.com",
                        "password": "password123"
                    }))
                    .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let auth_a: AuthResponse =
        serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
    let token_a = auth_a.token;
    let author_a = auth_a.author;

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({
                        "name": "Bob Author",
                        "email": "bob@example.com",
                        "password": "password123"
                    }))
                    .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let auth_b: AuthResponse =
        serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
    let token_b = auth_b.token;
    let author_b = auth_b.author;

    // Create 5 posts:
    // Post 1: Alice - "Rust Basics" - "Learn memory management"
    // Post 2: Alice - "Axum Web Framework" - "Routing and handlers"
    // Post 3: Alice - "SQLx Database" - "Compile time verification"
    // Post 4: Bob - "Frontend React" - "Modern UI with hooks"
    // Post 5: Bob - "Rust Concurrency" - "Async await and Tokio"
    let posts_data = vec![
        (&token_a, "Rust Basics", "Learn memory management"),
        (&token_a, "Axum Web Framework", "Routing and handlers"),
        (&token_a, "SQLx Database", "Compile time verification"),
        (&token_b, "Frontend React", "Modern UI with hooks"),
        (&token_b, "Rust Concurrency", "Async await and Tokio"),
    ];

    for (tok, title, content) in posts_data {
        let res = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/posts")
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", tok))
                    .body(Body::from(
                        serde_json::to_vec(&json!({
                            "author_id": 0,
                            "title": title,
                            "content": content
                        }))
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
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
