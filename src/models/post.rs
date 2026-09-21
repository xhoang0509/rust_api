use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::models::reaction::ReactionBreakdown;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, PartialEq, Eq)]
pub struct Post {
    pub id: i64,
    pub author_id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, PartialEq, Eq)]
pub struct PostWithAuthor {
    pub id: i64,
    pub author_id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
    pub author_name: String,
    pub author_email: String,
    #[serde(default)]
    pub reactions_count: i64,
    #[serde(default)]
    pub comments_count: i64,
    #[serde(default)]
    pub user_reaction: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PostDetail {
    pub id: i64,
    pub author_id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
    pub author_name: String,
    pub author_email: String,
    pub reactions_count: i64,
    pub comments_count: i64,
    pub user_reaction: Option<String>,
    pub reactions_breakdown: ReactionBreakdown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreatePost {
    #[serde(default)]
    pub author_id: i64,
    pub title: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UpdatePost {
    pub title: String,
    pub content: String,
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct PostQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub search: Option<String>,
    pub author_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub per_page: Option<u32>,
    pub total_pages: u32,
}
