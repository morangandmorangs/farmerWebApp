import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getAuth,
  signInWithPhoneNumber,
  signInWithPopup,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";

// Public web config (ships in the bundle); see .env.example.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when the web config is set, so Google and phone sign-in can work. */
export const firebaseConfigured = Object.values(config).every(Boolean);

let auth: Auth | null = null;

/**
 * Firebase Auth, started on first use rather than on import: without the
 * config, getAuth throws (auth/invalid-api-key), and at import time that
 * would take down the whole app, email sign-in included.
 */
function firebaseAuth(): Auth {
  if (!firebaseConfigured) {
    throw new Error(
      "Google and phone sign-in aren't set up yet. Add the VITE_FIREBASE_* values to .env.local and restart the dev server.",
    );
  }
  auth ??= getAuth(initializeApp(config));
  return auth;
}

/** Google popup; returns a Firebase ID token for the backend to verify. */
export async function googleIdToken(): Promise<string> {
  const { user } = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
  return user.getIdToken();
}

let verifier: RecaptchaVerifier | null = null;

/** Sends an SMS code to a 10-digit Indian number. `containerId` hosts the invisible reCAPTCHA. */
export async function sendOtp(tenDigits: string, containerId: string): Promise<ConfirmationResult> {
  const firebase = firebaseAuth();
  verifier?.clear();
  verifier = new RecaptchaVerifier(firebase, containerId, { size: "invisible" });
  try {
    return await signInWithPhoneNumber(firebase, `+91${tenDigits}`, verifier);
  } catch (err) {
    verifier.clear();
    verifier = null;
    throw err;
  }
}

/** Confirms the code and returns a Firebase ID token. */
export async function confirmOtp(confirmation: ConfirmationResult, code: string): Promise<string> {
  const { user } = await confirmation.confirm(code);
  return user.getIdToken();
}
