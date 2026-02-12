import { User } from "../types";

export interface AuthPayload {
  token: string;
  user: User;
}

const AUTH_TOKEN_KEY = "bulliontracker_auth_token_v1";

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return response.json();
};

export const saveAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const getAuthToken = (): string | null => localStorage.getItem(AUTH_TOKEN_KEY);

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const registerUser = async (payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthPayload> => {
  return requestJson<AuthPayload>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

export const loginUser = async (payload: {
  email: string;
  password: string;
}): Promise<AuthPayload> => {
  return requestJson<AuthPayload>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

export const fetchCurrentUser = async (token: string): Promise<User> => {
  const response = await requestJson<{ user: User }>("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.user;
};

export const logoutUser = async (token: string): Promise<void> => {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
};
