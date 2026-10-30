import { apiSlice } from "@/config/apiSlice";
import type { Farmer, ProfileStatus } from "@/lib/auth";

import { setCredentials, updateFarmer } from "../slice/authSlice";

// ─── Request Types ───────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export interface GoogleSignInRequest {
  idToken: string;
}

export interface PhoneSignInRequest {
  idToken: string;
  /** Used only when the phone number is new and an account is created. */
  name?: string;
}

// ─── Response Types ──────────────────────────────────────────────────────────

interface BaseResponse {
  success: boolean;
  message: string;
}

/** Every sign-in endpoint replies with this; the full profile comes from /farmers/me. */
export interface SessionResponse extends BaseResponse {
  data: {
    id: string;
    name: string;
    email?: string;
    role: string;
    profileStatus: ProfileStatus;
    canOperate: boolean;
    token: string;
    /** Phone sign-in only: true when this call created the account. */
    isNew?: boolean;
  };
}

export interface MyProfileResponse extends BaseResponse {
  data: Farmer;
}

// ─── API Slice ───────────────────────────────────────────────────────────────

/** Puts a successful sign-in into the auth slice. */
const toCredentials = ({ data }: SessionResponse) =>
  setCredentials({
    token: data.token,
    farmer: {
      id: data.id,
      name: data.name,
      email: data.email,
      profileStatus: data.profileStatus,
    },
  });

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ═════════════════════════════════════════════════════════════════════
    // SIGN-IN — /api/farmers/*
    // ═════════════════════════════════════════════════════════════════════

    login: builder.mutation<SessionResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/farmers/login",
        method: "POST",
        body: credentials,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success) dispatch(toCredentials(data));
        } catch (error) {
          console.error("Farmer login failed:", error);
        }
      },
    }),

    register: builder.mutation<SessionResponse, RegisterRequest>({
      query: (body) => ({
        url: "/farmers/register",
        method: "POST",
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success) dispatch(toCredentials(data));
        } catch (error) {
          console.error("Farmer registration failed:", error);
        }
      },
    }),

    googleSignIn: builder.mutation<SessionResponse, GoogleSignInRequest>({
      query: (body) => ({
        url: "/farmers/auth/google",
        method: "POST",
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success) dispatch(toCredentials(data));
        } catch (error) {
          console.error("Farmer Google sign-in failed:", error);
        }
      },
    }),

    phoneSignIn: builder.mutation<SessionResponse, PhoneSignInRequest>({
      query: (body) => ({
        url: "/farmers/auth/phone",
        method: "POST",
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success) dispatch(toCredentials(data));
        } catch (error) {
          console.error("Farmer phone sign-in failed:", error);
        }
      },
    }),

    // ═════════════════════════════════════════════════════════════════════
    // CURRENT FARMER — /api/farmers/me
    // ═════════════════════════════════════════════════════════════════════

    /** The full profile, including review status and note. Refreshes the stored farmer. */
    getMe: builder.query<MyProfileResponse, void>({
      query: () => "/farmers/me",
      providesTags: ["auth"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.success) dispatch(updateFarmer(data.data));
        } catch (error) {
          console.error("Loading the farmer profile failed:", error);
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleSignInMutation,
  usePhoneSignInMutation,
  useGetMeQuery,
} = authApi;
