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
  author_id: number;
  title: string;
  content: string;
}

export interface UpdatePost {
  title: string;
  content: string;
}
