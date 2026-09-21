import { request } from './client';
import type { PostReactionsResponse, ReactionSummary, ReactionType } from '../types';

export async function getPostReactions(postId: number): Promise<PostReactionsResponse> {
  return request<PostReactionsResponse>(`/api/posts/${postId}/reactions`);
}

export async function setPostReaction(
  postId: number,
  reactionType: ReactionType
): Promise<ReactionSummary> {
  return request<ReactionSummary>(`/api/posts/${postId}/reactions`, {
    method: 'PUT',
    body: JSON.stringify({ reaction_type: reactionType }),
  });
}

export async function deletePostReaction(postId: number): Promise<ReactionSummary> {
  return request<ReactionSummary>(`/api/posts/${postId}/reactions`, {
    method: 'DELETE',
  });
}
