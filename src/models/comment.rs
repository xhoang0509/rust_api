use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, PartialEq, Eq)]
pub struct Comment {
    pub id: i64,
    pub post_id: i64,
    pub author_id: i64,
    pub author_name: String,
    pub author_email: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreateComment {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UpdateComment {
    pub content: String,
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct CommentQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub per_page: Option<u32>,
}
