pub mod author;
pub mod post;

pub use author::{
    AuthResponse, Author, CreateAuthor, LoginRequest, RegisterRequest, UpdateAuthor,
};
pub use post::{CreatePost, PaginatedResponse, Post, PostQuery, PostWithAuthor, UpdatePost};
