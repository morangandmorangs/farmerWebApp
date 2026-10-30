import { ApiError } from "./api";
import { signedOut, selectFarmer, selectToken } from "@/store/slice/authSlice";
import {
  useGetMeQuery,
  useGoogleSignInMutation,
  useLoginMutation,
  usePhoneSignInMutation,
  useRegisterMutation,
  type RegisterRequest,
} from "@/store/services/authApi";
import { useAppDispatch, useAppSelector } from "@/store/store";

export type ProfileStatus = "pending-documents" | "under-review" | "approved" | "rejected" | "suspended";

export type Farmer = {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  /** How the account was created: "password" (email), "phone" or "google". */
  provider: string;
  profileStatus: ProfileStatus;
  reviewNote?: string;
};

/** An RTK Query failure as an Error, which is what the screens' toasts read. */
const asError = (err: unknown): Error => {
  if (err instanceof Error) return err;
  if (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string") {
    const status = "status" in err && typeof err.status === "number" ? err.status : 0;
    const code = "code" in err && typeof err.code === "string" ? err.code : undefined;
    return new ApiError(err.message, status, code);
  }
  return new Error("Something went wrong");
};

const attempt = async (call: PromiseLike<unknown>) => {
  try {
    await call;
  } catch (err) {
    throw asError(err);
  }
};

/**
 * The signed-in farmer, from the Redux store. Signing in stores the token and
 * a short profile; `/farmers/me` then fills in the rest (provider, review note).
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectToken);
  const farmer = useAppSelector(selectFarmer);
  const me = useGetMeQuery(undefined, { skip: !token });
  const [login] = useLoginMutation();
  const [register] = useRegisterMutation();
  const [googleSignIn] = useGoogleSignInMutation();
  const [phoneSignIn] = usePhoneSignInMutation();

  return {
    farmer,
    loading: token !== null && farmer === null && me.isLoading,
    signInWithEmail: (email: string, password: string) => attempt(login({ email, password }).unwrap()),
    register: (input: RegisterRequest) => attempt(register(input).unwrap()),
    signInWithGoogle: (idToken: string) => attempt(googleSignIn({ idToken }).unwrap()),
    signInWithPhone: (idToken: string, name?: string) => attempt(phoneSignIn({ idToken, name }).unwrap()),
    signOut: () => dispatch(signedOut()),
  };
}
