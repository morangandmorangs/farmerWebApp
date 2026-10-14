import type { ConfirmationResult } from "firebase/auth";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { confirmOtp, googleIdToken, sendOtp } from "@/lib/firebase";

type Mode = "email" | "phone" | "register";
const PHONE = /^[6-9]\d{9}$/;

export default function Login() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("email");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState<ConfirmationResult | null>(null);

  if (auth.farmer) return <Navigate to="/" replace />;

  async function run(job: () => Promise<void>) {
    setBusy(true);
    try {
      await job();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (mode === "email") return auth.signInWithEmail(email.trim(), password);
      if (mode === "register") {
        if (!PHONE.test(phone)) throw new Error("Enter a valid 10-digit mobile number");
        return auth.register({ name: name.trim(), email: email.trim(), password, phoneNumber: phone });
      }
      if (!otp) {
        if (!PHONE.test(phone)) throw new Error("Enter a valid 10-digit mobile number");
        setOtp(await sendOtp(phone, "recaptcha"));
        toast.success("Code sent by SMS");
        return;
      }
      return auth.signInWithPhone(await confirmOtp(otp, code.trim()), name.trim() || undefined);
    });
  };

  const tab = (m: Mode, label: string) => (
    <Button type="button" size="sm" variant={mode === m ? "default" : "outline"} onClick={() => { setMode(m); setOtp(null); }}>
      {label}
    </Button>
  );

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Local Mart Farmer</CardTitle>
          <CardDescription>Sign in to manage your farm and crops.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex gap-2">
            {tab("email", "Email")}
            {tab("phone", "Phone OTP")}
            {tab("register", "Sign up")}
          </div>

          <form onSubmit={submit} className="grid gap-3">
            {(mode === "register" || (mode === "phone" && !otp)) && (
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" required={mode === "register"} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            {mode !== "phone" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </>
            )}
            {(mode === "phone" || mode === "register") && (
              <div className="grid gap-2">
                <Label htmlFor="phone">Mobile number</Label>
                <Input id="phone" inputMode="numeric" maxLength={10} required disabled={otp !== null} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
              </div>
            )}
            {mode === "phone" && otp && (
              <div className="grid gap-2">
                <Label htmlFor="code">SMS code</Label>
                <Input id="code" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "email" ? "Sign in" : mode === "register" ? "Create account" : otp ? "Verify and sign in" : "Send code"}
            </Button>
          </form>
          <div id="recaptcha" />

          <Button type="button" variant="outline" disabled={busy} onClick={() => run(async () => auth.signInWithGoogle(await googleIdToken()))}>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
