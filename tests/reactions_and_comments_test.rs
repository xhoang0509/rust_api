use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use rust_api::{
    create_app,
    db::init_pool,
    models::comment::Comment,
    models::post::{PaginatedResponse, Post, PostDetail, PostWithAuthor},
    models::reaction::{PostReactionsResponse, ReactionSummary},
    AuthResponse,
};
use serde_json::json;
use tower::ServiceExt;

async fn register_user(app: &axum::Router, name: &str, email: &str) -> (i64, String) {
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({
                        "name": name,
                        "email": email,
                        "password": "password123"
                    }))
                    .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let auth_data: AuthResponse = serde_json::from_slice(&body).unwrap();
    (auth_data.author.id, auth_data.token)
}

async fn create_post_helper(app: &axum::Router, token: &str, title: &str, content: &str) -> i64 {
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/posts")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({
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
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let post: Post = serde_json::from_slice(&body).unwrap();
    post.id
}

#[tokio::test]
async fn test_reactions_lifecycle_and_toggle() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    let (_author_a_id, token_a) = register_user(&app, "Author A", "author_a@example.com").await;
    let (_author_b_id, token_b) = register_user(&app, "Author B", "author_b@example.com").await;

    let post_id = create_post_helper(&app, &token_a, "Post 1", "Content 1").await;

    // 1. Initially 0 reactions
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts/{}/reactions", post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let reactions_resp: PostReactionsResponse = serde_json::from_slice(&body).unwrap();
    assert_eq!(reactions_resp.total, 0);
    assert_eq!(reactions_resp.breakdown.like, 0);
    assert!(reactions_resp.items.is_empty());
    assert_eq!(reactions_resp.user_reaction, None);

    // 2. Unauthenticated attempt to react fails with 401
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction_type": "like" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 3. Invalid reaction type returns 400
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction_type": "dislike" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 4. Author A adds 'like' reaction
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction_type": "like" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let summary: ReactionSummary = serde_json::from_slice(&body).unwrap();
    assert_eq!(summary.total, 1);
    assert_eq!(summary.breakdown.like, 1);
    assert_eq!(summary.user_reaction, Some("like".to_string()));

    // 5. Author B adds 'love' reaction
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction": "love" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let summary_b: ReactionSummary = serde_json::from_slice(&body).unwrap();
    assert_eq!(summary_b.total, 2);
    assert_eq!(summary_b.breakdown.like, 1);
    assert_eq!(summary_b.breakdown.love, 1);
    assert_eq!(summary_b.user_reaction, Some("love".to_string()));

    // 6. Check reactions list with Author A authenticated
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let reactions_resp: PostReactionsResponse = serde_json::from_slice(&body).unwrap();
    assert_eq!(reactions_resp.total, 2);
    assert_eq!(reactions_resp.user_reaction, Some("like".to_string()));
    assert_eq!(reactions_resp.items.len(), 2);

    // 7. Author A changes reaction from 'like' to 'haha'
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction_type": "haha" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let summary: ReactionSummary = serde_json::from_slice(&body).unwrap();
    assert_eq!(summary.total, 2);
    assert_eq!(summary.breakdown.like, 0);
    assert_eq!(summary.breakdown.haha, 1);
    assert_eq!(summary.breakdown.love, 1);
    assert_eq!(summary.user_reaction, Some("haha".to_string()));

    // 8. Author A toggles off by sending 'haha' again
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction_type": "haha" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let summary: ReactionSummary = serde_json::from_slice(&body).unwrap();
    assert_eq!(summary.total, 1);
    assert_eq!(summary.breakdown.haha, 0);
    assert_eq!(summary.breakdown.love, 1);
    assert_eq!(summary.user_reaction, None);

    // 9. Author B deletes reaction via DELETE endpoint
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let summary: ReactionSummary = serde_json::from_slice(&body).unwrap();
    assert_eq!(summary.total, 0);
    assert_eq!(summary.breakdown.love, 0);
    assert_eq!(summary.user_reaction, None);

    // 10. Reactions for non-existent post returns 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts/99999/reactions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_comments_crud_permissions_and_pagination() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    let (author_a_id, token_a) = register_user(&app, "Post Owner", "owner@example.com").await;
    let (author_b_id, token_b) =
        register_user(&app, "Commenter B", "commenter_b@example.com").await;
    let (_author_c_id, token_c) = register_user(&app, "Third Party C", "third_c@example.com").await;

    let post_id = create_post_helper(&app, &token_a, "Owner Post", "Owner Content").await;

    // 1. Add comment by Commenter B
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Great post by owner!" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let comment_b: Comment = serde_json::from_slice(&body).unwrap();
    assert_eq!(comment_b.post_id, post_id);
    assert_eq!(comment_b.author_id, author_b_id);
    assert_eq!(comment_b.author_name, "Commenter B");
    assert_eq!(comment_b.author_email, "commenter_b@example.com");
    assert_eq!(comment_b.content, "Great post by owner!");

    // 2. Reject empty or whitespace comment
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "   " })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 3. Add second comment by Post Owner A
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Thanks for reading!" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let comment_a: Comment = serde_json::from_slice(&body).unwrap();
    assert_eq!(comment_a.author_id, author_a_id);

    // 4. List comments with pagination
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts/{}/comments?page=1&limit=10", post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let list_resp: PaginatedResponse<Comment> = serde_json::from_slice(&body).unwrap();
    assert_eq!(list_resp.total, 2);
    assert_eq!(list_resp.items.len(), 2);
    // Chronological order: Comment B first, then Comment A
    assert_eq!(list_resp.items[0].id, comment_b.id);
    assert_eq!(list_resp.items[1].id, comment_a.id);

    // 5. Edit comment:
    // Third Party C cannot edit Comment B (403)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/comments/{}", comment_b.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_c))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Hacked content" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // Post owner A cannot edit Comment B (only author can edit)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/comments/{}", comment_b.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Owner edited content" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // Commenter B successfully updates own comment
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/comments/{}", comment_b.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Updated comment by B" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let updated_b: Comment = serde_json::from_slice(&body).unwrap();
    assert_eq!(updated_b.content, "Updated comment by B");

    // 6. Delete comment:
    // Third party C cannot delete Comment B (403)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/comments/{}", comment_b.id))
                .header("authorization", format!("Bearer {}", token_c))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::FORBIDDEN);

    // Post owner A CAN delete Comment B (moderation permission!)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/comments/{}", comment_b.id))
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    // Comment A can be deleted by its author (Post owner A)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/comments/{}", comment_a.id))
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    // Verify comments list is now empty
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts/{}/comments", post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let list_resp: PaginatedResponse<Comment> = serde_json::from_slice(&body).unwrap();
    assert_eq!(list_resp.total, 0);
    assert!(list_resp.items.is_empty());
}

#[tokio::test]
async fn test_post_detail_and_list_with_reaction_and_comment_counts() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    let (_author_a_id, token_a) = register_user(&app, "User A", "usera@example.com").await;
    let (_author_b_id, token_b) = register_user(&app, "User B", "userb@example.com").await;

    let post_id = create_post_helper(&app, &token_a, "Count Test Post", "Count Content").await;

    // User A reacts 'love'
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction_type": "love" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // User B reacts 'haha'
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction_type": "haha" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // User B comments
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Comment 1" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);

    // 1. GET /api/posts/{id} as User A
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts/{}", post_id))
                .header("authorization", format!("Bearer {}", token_a))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let detail: PostDetail = serde_json::from_slice(&body).unwrap();
    assert_eq!(detail.reactions_count, 2);
    assert_eq!(detail.comments_count, 1);
    assert_eq!(detail.user_reaction, Some("love".to_string()));
    assert_eq!(detail.reactions_breakdown.love, 1);
    assert_eq!(detail.reactions_breakdown.haha, 1);
    assert_eq!(detail.reactions_breakdown.like, 0);

    // 2. GET /api/posts as User B
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts")
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let list: PaginatedResponse<PostWithAuthor> = serde_json::from_slice(&body).unwrap();
    assert_eq!(list.items.len(), 1);
    assert_eq!(list.items[0].reactions_count, 2);
    assert_eq!(list.items[0].comments_count, 1);
    assert_eq!(list.items[0].user_reaction, Some("haha".to_string()));

    // 3. GET /api/posts as unauthenticated user
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
    let list: PaginatedResponse<PostWithAuthor> = serde_json::from_slice(&body).unwrap();
    assert_eq!(list.items[0].reactions_count, 2);
    assert_eq!(list.items[0].comments_count, 1);
    assert_eq!(list.items[0].user_reaction, None);

    // 4. Cascade deletion test: deleting the post should cascade delete reactions and comments
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

    // Reactions endpoint should now return 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts/{}/reactions", post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // Comments endpoint should now return 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts/{}/comments", post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_all_six_reaction_types() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    let (_post_author_id, post_token) =
        register_user(&app, "Post Author", "author@example.com").await;
    let post_id =
        create_post_helper(&app, &post_token, "Reactions Test Post", "Post Content").await;

    let reaction_types = ["like", "love", "haha", "wow", "sad", "angry"];
    let mut tokens = Vec::new();

    for (i, &rtype) in reaction_types.iter().enumerate() {
        let name = format!("User {}", i);
        let email = format!("user{}@example.com", i);
        let (_uid, token) = register_user(&app, &name, &email).await;

        let res = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("PUT")
                    .uri(format!("/api/posts/{}/reactions", post_id))
                    .header("content-type", "application/json")
                    .header("authorization", format!("Bearer {}", token))
                    .body(Body::from(
                        serde_json::to_vec(&json!({ "reaction_type": rtype })).unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        tokens.push(token);
    }

    // Check GET reactions
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/posts/{}/reactions", post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let reactions_resp: PostReactionsResponse = serde_json::from_slice(&body).unwrap();
    assert_eq!(reactions_resp.total, 6);
    assert_eq!(reactions_resp.breakdown.like, 1);
    assert_eq!(reactions_resp.breakdown.love, 1);
    assert_eq!(reactions_resp.breakdown.haha, 1);
    assert_eq!(reactions_resp.breakdown.wow, 1);
    assert_eq!(reactions_resp.breakdown.sad, 1);
    assert_eq!(reactions_resp.breakdown.angry, 1);
    assert_eq!(reactions_resp.items.len(), 6);

    // Check post detail returns total 6 and correct breakdown
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
    let detail: PostDetail = serde_json::from_slice(&body).unwrap();
    assert_eq!(detail.reactions_count, 6);
    assert_eq!(detail.reactions_breakdown.like, 1);
    assert_eq!(detail.reactions_breakdown.love, 1);
    assert_eq!(detail.reactions_breakdown.haha, 1);
    assert_eq!(detail.reactions_breakdown.wow, 1);
    assert_eq!(detail.reactions_breakdown.sad, 1);
    assert_eq!(detail.reactions_breakdown.angry, 1);
}

#[tokio::test]
async fn test_unauthenticated_requests_fail() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    let (_author_id, token) = register_user(&app, "Post Author", "author_auth@example.com").await;
    let post_id = create_post_helper(&app, &token, "Auth Post", "Auth Content").await;

    // Create a comment with auth first so we have a comment_id to test
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Initial Comment" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let comment: Comment = serde_json::from_slice(&body).unwrap();

    // 1. Unauthenticated PUT /api/posts/{id}/reactions -> 401
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction_type": "like" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 2. Unauthenticated DELETE /api/posts/{id}/reactions -> 401
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 3. Unauthenticated POST /api/posts/{id}/comments -> 401
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Anon Comment" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 4. Unauthenticated PUT /api/comments/{id} -> 401
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/comments/{}", comment.id))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Anon Update" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 5. Unauthenticated DELETE /api/comments/{id} -> 401
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/comments/{}", comment.id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_validation_and_not_found_edge_cases() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool);

    let (_author_id, token) = register_user(&app, "Validation User", "val@example.com").await;
    let post_id = create_post_helper(&app, &token, "Val Post", "Val Content").await;

    // 1. Create comment with empty string -> 400
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 2. Create comment with whitespace only -> 400
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "  \n\t  " })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 2b. Create comment exceeding 5,000 characters -> 400
    let too_long_content = "a".repeat(5001);
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": too_long_content })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // Create a valid comment
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Initial text" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let comment: Comment = serde_json::from_slice(&body).unwrap();

    // 3. Update comment with empty string -> 400
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/comments/{}", comment.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 4. Update comment with whitespace only -> 400
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/comments/{}", comment.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "   " })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 4b. Update comment exceeding 5,000 characters -> 400
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/comments/{}", comment.id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": too_long_content })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 5. Update non-existent comment -> 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/comments/99999")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "New text" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 6. Delete non-existent comment -> 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/comments/99999")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 7. Create comment on non-existent post -> 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/posts/99999/comments")
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Comment on ghost" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 8. List comments on non-existent post -> 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/posts/99999/comments")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    // 9. Delete reaction on non-existent post -> 404
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/posts/99999/reactions")
                .header("authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_database_cascade_deletion() {
    let pool = init_pool("sqlite::memory:").await.unwrap();
    let app = create_app(pool.clone());

    let (_post_author_id, post_token) =
        register_user(&app, "Post Cascade Author", "post_cas@example.com").await;
    let (_user_b_id, token_b) = register_user(&app, "User B Cas", "user_b_cas@example.com").await;

    let post_id = create_post_helper(&app, &post_token, "Cascade Post", "Cascade Content").await;

    // User A reacts 'like'
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", post_token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction_type": "like" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // User B reacts 'love'
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/posts/{}/reactions", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "reaction_type": "love" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // User A comments
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", post_token))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Comment 1" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);

    // User B comments
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/posts/{}/comments", post_id))
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token_b))
                .body(Body::from(
                    serde_json::to_vec(&json!({ "content": "Comment 2" })).unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);

    // Verify row counts in the SQLite database directly
    let reaction_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM post_reactions WHERE post_id = ?")
            .bind(post_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(reaction_count.0, 2);

    let comment_count: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM post_comments WHERE post_id = ?")
            .bind(post_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(comment_count.0, 2);

    // Delete the post via API
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/posts/{}", post_id))
                .header("authorization", format!("Bearer {}", post_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    // Verify that reactions and comments are completely deleted in the SQLite database
    let reaction_count_after: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM post_reactions WHERE post_id = ?")
            .bind(post_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(reaction_count_after.0, 0);

    let comment_count_after: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM post_comments WHERE post_id = ?")
            .bind(post_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(comment_count_after.0, 0);
}
