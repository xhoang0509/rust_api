import { request } from './client';
import type { Author, CreateAuthor, UpdateAuthor } from '../types';

const BASE_PATH = '/api/authors';

export async function getAuthors(): Promise<Author[]> {
  return request<Author[]>(BASE_PATH);
}

export async function getAuthor(id: number): Promise<Author> {
  return request<Author>(`${BASE_PATH}/${id}`);
}

export async function createAuthor(data: CreateAuthor): Promise<Author> {
  return request<Author>(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAuthor(id: number, data: UpdateAuthor): Promise<Author> {
  return request<Author>(`${BASE_PATH}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAuthor(id: number): Promise<void> {
  return request<void>(`${BASE_PATH}/${id}`, {
    method: 'DELETE',
  });
}
