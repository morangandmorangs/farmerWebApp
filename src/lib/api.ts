import { selectToken, signedOut } from "@/store/slice/authSlice";
import { store } from "@/store/store";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const BASE = import.meta.env.VITE_API_URL ?? "/api";

/** Calls localMart-BEE and unwraps its `{ success, data }` envelope. A 401 while signed in signs the farmer out. */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const token = selectToken(store.getState());
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body = await res.json().catch(() => null);
  if (res.status === 401 && token) store.dispatch(signedOut());
  if (!res.ok || body?.success === false) {
    throw new ApiError(body?.message ?? `Request failed (${res.status})`, res.status, body?.code);
  }
  return body.data as T;
}
