import { authClient } from "./auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8082";

// ApiError carries the code and message from the API's standard error format.
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Ask Better Auth for a short-lived JWT (needs the session cookie).
async function getToken(): Promise<string> {
  const { data, error } = await authClient.token();
  if (error || !data?.token) throw new ApiError(401, "unauthorized", "You are not signed in");
  return data.token;
}

// Call the Go API with the token attached. Throws ApiError for any non-2xx response.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    // Authorization comes last so a caller cannot override it.
    headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.code ?? "unknown", body?.error?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export type Me = { user_id: string; roles: string[] };

export const getMe = () => api<Me>("/api/v1/me");
