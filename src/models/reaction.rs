use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReactionType {
    Like,
    Love,
    Haha,
    Wow,
    Sad,
    Angry,
}

impl ReactionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ReactionType::Like => "like",
            ReactionType::Love => "love",
            ReactionType::Haha => "haha",
            ReactionType::Wow => "wow",
            ReactionType::Sad => "sad",
            ReactionType::Angry => "angry",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "like" => Some(ReactionType::Like),
            "love" => Some(ReactionType::Love),
            "haha" => Some(ReactionType::Haha),
            "wow" => Some(ReactionType::Wow),
            "sad" => Some(ReactionType::Sad),
            "angry" => Some(ReactionType::Angry),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct ReactionBreakdown {
    pub like: i64,
    pub love: i64,
    pub haha: i64,
    pub wow: i64,
    pub sad: i64,
    pub angry: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReactionSummary {
    pub total: i64,
    pub reactions_count: i64,
    pub breakdown: ReactionBreakdown,
    pub user_reaction: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, PartialEq, Eq)]
pub struct ReactorItem {
    pub id: i64,
    pub post_id: i64,
    pub author_id: i64,
    pub author_name: String,
    pub author_email: String,
    pub reaction_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PostReactionsResponse {
    pub total: i64,
    pub reactions_count: i64,
    pub breakdown: ReactionBreakdown,
    pub user_reaction: Option<String>,
    pub items: Vec<ReactorItem>,
    pub reactions: Vec<ReactorItem>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SetReactionRequest {
    #[serde(alias = "reaction")]
    pub reaction_type: String,
}
