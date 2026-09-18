export interface Author {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

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
