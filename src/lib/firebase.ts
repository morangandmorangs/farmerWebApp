import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getAuth,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
} from "firebase/auth";

// Public web config (ships in the bundle); see .env.example.
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const auth = getAuth(app);

/** Google popup; returns a Firebase ID token for the backend to verify. */
export async function googleIdToken(): Promise<string> {
  const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
  return user.getIdToken();
}

let verifier: RecaptchaVerifier | null = null;

/** Sends an SMS code to a 10-digit Indian number. `containerId` hosts the invisible reCAPTCHA. */
export async function sendOtp(tenDigits: string, containerId: string): Promise<ConfirmationResult> {
  verifier?.clear();
  verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  try {
    return await signInWithPhoneNumber(auth, `+91${tenDigits}`, verifier);
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
