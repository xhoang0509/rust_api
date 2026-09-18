import { request } from './client';
import type { PostWithAuthor, CreatePost, UpdatePost } from '../types';

const BASE_PATH = '/api/posts';

export async function getPosts(): Promise<PostWithAuthor[]> {
  return request<PostWithAuthor[]>(BASE_PATH);
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
