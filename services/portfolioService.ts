import { Purchase } from "../types";

const requestJson = async <T>(url: string, token: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return response.json();
};

export const fetchUserPurchases = async (token: string): Promise<Purchase[]> => {
  return requestJson<Purchase[]>("/api/purchases", token, {
    method: "GET",
  });
};

export const createUserPurchase = async (
  token: string,
  purchase: Omit<Purchase, "id">
): Promise<Purchase> => {
  return requestJson<Purchase>("/api/purchases", token, {
    method: "POST",
    body: JSON.stringify(purchase),
  });
};

export const deleteUserPurchase = async (token: string, id: string): Promise<void> => {
  await requestJson<{ ok: boolean }>(`/api/purchases/${encodeURIComponent(id)}`, token, {
    method: "DELETE",
  });
};
