import { request } from './client';
import type {
  PostWithAuthor,
  CreatePost,
  UpdatePost,
  PaginatedResponse,
  PostQueryParams,
} from '../types';

const BASE_PATH = '/api/posts';

export async function getPosts(
  params?: PostQueryParams,
): Promise<PaginatedResponse<PostWithAuthor>> {
  const searchParams = new URLSearchParams();
  if (params?.page !== undefined) {
    searchParams.set('page', params.page.toString());
  }
  if (params?.limit !== undefined) {
    searchParams.set('limit', params.limit.toString());
  }
  if (params?.search !== undefined && params.search.trim() !== '') {
    searchParams.set('search', params.search.trim());
  }
  if (params?.author_id !== undefined) {
    searchParams.set('author_id', params.author_id.toString());
  }

  const queryString = searchParams.toString();
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;

  return request<PaginatedResponse<PostWithAuthor>>(url);
}

export async function getPost(id: number): Promise<PostWithAuthor> {
  return request<PostWithAuthor>(`${BASE_PATH}/${id}`);
}

export async function createPost(data: CreatePost): Promise<PostWithAuthor> {
  return request<PostWithAuthor>(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePost(id: number, data: UpdatePost): Promise<PostWithAuthor> {
  return request<PostWithAuthor>(`${BASE_PATH}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePost(id: number): Promise<void> {
  return request<void>(`${BASE_PATH}/${id}`, {
    method: 'DELETE',
  });
}
