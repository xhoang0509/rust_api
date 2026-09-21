# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-09-21

### Added
- **Facebook-Style Private Social Feed UI**:
  - Implemented 3-column layout: Top Header, Left Navigation Sidebar, Center News Feed, and Right Community Sidebar.
  - Redesigned using Ant Design (`antd`) and `@ant-design/icons` with Facebook Blue (`#1877F2`) and `#F0F2F5` layout background.
  - "What's on your mind?" create post quick card with modal form validation and character count.
  - Filter and search bar with keyword search and author dropdown filter with quick dismiss tags.
  - Member directory view (`MembersView`) displaying members in a responsive card grid.
  - Redesigned authentication screen (`AuthView`) with Antd tabs, inputs, and password security.
- **Post Reactions**:
  - Six emotional reactions: `like` (👍), `love` (❤️), `haha` (😆), `wow` (😮), `sad` (😢), `angry` (😡).
  - Floating emoji picker popover on hover with scale animations and tooltips.
  - Single-reaction rule per user per post with toggle-off (re-reacting with same emoji removes reaction) and replace behaviors.
  - Stacked reaction badges and detailed tooltip breakdown in engagement summary.
  - Backend endpoints: `GET /api/posts/{id}/reactions`, `PUT /api/posts/{id}/reactions`, `DELETE /api/posts/{id}/reactions`.
- **Post Comments**:
  - Chronological comment threads with author avatars, names, and relative UTC timestamps.
  - Inline comment editing for comment authors with maximum 5,000 character validation.
  - Comment deletion with authorization for comment authors and moderation permission for post owners.
  - Collapsible comment section with pagination ("View more comments").
  - Backend endpoints: `GET /api/posts/{id}/comments`, `POST /api/posts/{id}/comments`, `PUT /api/comments/{id}`, `DELETE /api/comments/{id}`.
- **Database Migrations**:
  - `0003_reactions_and_comments.sql`: SQLite tables `post_reactions` and `post_comments` with foreign key cascade deletion.

### Changed
- Updated `GET /api/posts` and `GET /api/posts/{id}` to return `reactions_count`, `comments_count`, and user-specific `user_reaction`.
- Introduced `OptionalAuthUser` extractor to allow unauthenticated post browsing while personalizing reactions for authenticated users.

## [0.1.0] - 2026-09-18

### Added
- Initial full-stack Rust + React architecture.
- Backend with Axum 0.8, Tokio, SQLx SQLite, Argon2 password hashing, and JWT authentication.
- Frontend with React 19, TypeScript, Vite, and Tailwind CSS v4 embedded via `rust-embed`.
- Author and post CRUD management with SQLite persistence.
- CI/CD workflow with GitHub Actions and Docker build pipeline.
