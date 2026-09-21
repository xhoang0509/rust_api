export interface Author {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export type CurrentUser = Author;

export interface CreateAuthor {
  name: string;
  email: string;
}

export interface UpdateAuthor {
  name: string;
  email: string;
}

export interface Post {
  id: number;
  author_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PostWithAuthor {
  id: number;
  author_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_email: string;
  reactions_count?: number;
  comments_count?: number;
  user_reaction?: ReactionType | null;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface ReactionBreakdown {
  like: number;
  love: number;
  haha: number;
  wow: number;
  sad: number;
  angry: number;
}

export interface ReactorItem {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  author_email: string;
  reaction_type: ReactionType | string;
  created_at: string;
}

export interface ReactionSummary {
  total: number;
  reactions_count: number;
  breakdown: ReactionBreakdown;
  user_reaction: ReactionType | null;
}

export interface PostReactionsResponse extends ReactionSummary {
  items: ReactorItem[];
  reactions: ReactorItem[];
}

export interface Comment {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CreatePost {
  author_id?: number;
  title: string;
  content: string;
}

export interface UpdatePost {
  title: string;
  content: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  author: Author;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PostQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  author_id?: number;
}
