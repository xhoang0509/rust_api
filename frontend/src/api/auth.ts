import { request } from './client';
import type { Author, LoginRequest, RegisterRequest, AuthResponse } from '../types';

const BASE_PATH = '/api/auth';

export async function login(data: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>(`${BASE_PATH}/login`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>(`${BASE_PATH}/register`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<Author> {
  return request<Author>(`${BASE_PATH}/me`);
}
