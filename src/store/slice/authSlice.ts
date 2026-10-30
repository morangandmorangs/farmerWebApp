import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Farmer } from "@/lib/auth";

/** What the store keeps of the farmer: the sign-in reply has no `provider`, `/farmers/me` fills it in. */
export type AuthFarmer = Pick<Farmer, "id" | "name" | "email" | "phoneNumber" | "profileStatus" | "reviewNote"> &
  Partial<Pick<Farmer, "provider">>;

export type AuthState = {
  /** The bearer token from the farmer sign-in endpoints; null when signed out. */
  token: string | null;
  farmer: AuthFarmer | null;
};

const initialState: AuthState = { token: null, farmer: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; farmer: AuthFarmer }>) {
      state.token = action.payload.token;
      state.farmer = action.payload.farmer;
    },
    updateFarmer(state, action: PayloadAction<Partial<AuthFarmer>>) {
      if (state.farmer) Object.assign(state.farmer, action.payload);
    },
    signedOut(state) {
      state.token = null;
      state.farmer = null;
    },
  },
});

export const { setCredentials, updateFarmer, signedOut } = authSlice.actions;

/** Narrow state shape so selectors don't import RootState (avoids a cycle with store.ts). */
type WithAuth = { auth: AuthState };

export const selectToken = (state: WithAuth) => state.auth.token;
export const selectFarmer = (state: WithAuth) => state.auth.farmer;
export const selectIsAuthenticated = (state: WithAuth) => state.auth.token !== null;

export default authSlice.reducer;
