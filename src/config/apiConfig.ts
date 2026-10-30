import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

import { selectToken, signedOut } from "@/store/slice/authSlice";

export const API_CONFIG = {
  // Same origin: Vite proxies /api to the gateway in dev (same default as lib/api.ts).
  BASE_URL: import.meta.env.VITE_API_URL ?? "/api",
};

/** A failed call, as every hook and `.unwrap()` reports it. */
export interface ApiFailure {
  status: FetchBaseQueryError["status"];
  message: string;
  /** localMart-BEE's error code, e.g. VALIDATION_FAILED, TOKEN_EXPIRED. */
  code?: string;
}

/** A string field of an error body, which is the server's and unchecked. */
const field = (body: unknown, key: string): string | undefined => {
  const value: unknown = typeof body === "object" && body !== null ? Reflect.get(body, key) : undefined;
  return typeof value === "string" ? value : undefined;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_CONFIG.BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    // RTK Query passes the store's state untyped; it is this app's own store.
    const token = selectToken(getState() as Parameters<typeof selectToken>[0]);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

/**
 * Calls localMart-BEE and turns its error envelope
 * (`{ success: false, message, code }`) into an ApiFailure. A 401 while
 * signed in means the token expired or the account was disabled, so the
 * farmer is signed out.
 */
export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiFailure> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (!result.error) return { data: result.data, meta: result.meta };

  const { status } = result.error;
  const body = "data" in result.error ? result.error.data : undefined;
  if (status === 401 && selectToken(api.getState() as Parameters<typeof selectToken>[0])) {
    api.dispatch(signedOut());
  }

  const code = field(body, "code");
  return {
    error: {
      status,
      message:
        field(body, "message") ??
        (status === "FETCH_ERROR" ? "Can't reach localMart-BEE. Is the gateway running?" : `Request failed (${status})`),
      ...(code ? { code } : {}),
    },
  };
};
