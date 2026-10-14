import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, getToken, setToken } from "./api";

export type ProfileStatus = "pending-documents" | "under-review" | "approved" | "rejected" | "suspended";

export type Farmer = {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  profileStatus: ProfileStatus;
  reviewNote?: string;
  documents: { kind: string; url: string; submittedAt: string }[];
};

type Session = Farmer & { token: string };

type AuthValue = {
  farmer: Farmer | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; phoneNumber: string }) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithPhone: (idToken: string, name?: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(() => getToken() !== null);

  const refresh = useCallback(async () => {
    setFarmer(await api<Farmer>("/farmers/me"));
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    refresh()
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [refresh]);

  // The sign-in responses are small; the full profile (documents, note) comes from /me.
  const start = useCallback(
    async (session: Session) => {
      setToken(session.token);
      await refresh();
    },
    [refresh],
  );

  const value: AuthValue = {
    farmer,
    loading,
    refresh,
    signInWithEmail: async (email, password) =>
      start(await api<Session>("/farmers/login", { method: "POST", json: { email, password } })),
    register: async (input) => start(await api<Session>("/farmers/register", { method: "POST", json: input })),
    signInWithGoogle: async (idToken) =>
      start(await api<Session>("/farmers/auth/google", { method: "POST", json: { idToken } })),
    signInWithPhone: async (idToken, name) =>
      start(await api<Session>("/farmers/auth/phone", { method: "POST", json: { idToken, name } })),
    signOut: () => {
      setToken(null);
      setFarmer(null);
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
