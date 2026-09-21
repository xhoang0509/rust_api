import { request } from './client';
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  PaginatedResponse,
} from '../types';

export interface CommentQueryParams {
  page?: number;
  limit?: number;
}

export async function getComments(
  postId: number,
  params?: CommentQueryParams
): Promise<PaginatedResponse<Comment>> {
  const searchParams = new URLSearchParams();
  if (params?.page !== undefined) {
    searchParams.set('page', params.page.toString());
  }
  if (params?.limit !== undefined) {
    searchParams.set('limit', params.limit.toString());
  }

  const queryString = searchParams.toString();
  const url = queryString
    ? `/api/posts/${postId}/comments?${queryString}`
    : `/api/posts/${postId}/comments`;

  return request<PaginatedResponse<Comment>>(url);
}

export async function createComment(
  postId: number,
  data: CreateCommentRequest | string
): Promise<Comment> {
  const payload = typeof data === 'string' ? { content: data } : data;
  return request<Comment>(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateComment(
  commentId: number,
  data: UpdateCommentRequest | string
): Promise<Comment> {
  const payload = typeof data === 'string' ? { content: data } : data;
  return request<Comment>(`/api/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteComment(commentId: number): Promise<void> {
  return request<void>(`/api/comments/${commentId}`, {
    method: 'DELETE',
  });
}
