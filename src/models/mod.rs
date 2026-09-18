pub mod author;
pub mod post;

pub use author::{Author, CreateAuthor, UpdateAuthor};
pub use post::{CreatePost, PaginatedResponse, Post, PostQuery, PostWithAuthor, UpdatePost};
