import type { ConfirmationResult } from "firebase/auth";
import {
  ArrowRight,
  ChartColumn,
  Check,
  Circle,
  KeyRound,
  Leaf,
  Lock,
  Mail,
  Phone,
  PhoneCall,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Sprout,
  Store,
  User,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

import fieldsPhoto from "@/assets/login/fields.webp";
import farmerPhoto from "@/assets/login/farmer.webp";
import leavesPhoto from "@/assets/login/leaves.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/PasswordInput";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { confirmOtp, googleIdToken, sendOtp } from "@/lib/firebase";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

type Mode = "email" | "phone" | "register";
const PHONE = /^[6-9]\d{9}$/;

const TABS: { mode: Mode; label: string; icon: LucideIcon }[] = [
  { mode: "email", label: "Email", icon: Mail },
  { mode: "phone", label: "Phone OTP", icon: PhoneCall },
  { mode: "register", label: "Sign up", icon: UserPlus },
];

const HEADINGS: Record<Mode, { title: string; text: string }> = {
  email: { title: "Sign in to your Farmer Account", text: "Welcome back. Manage your farm, crops and harvest in one place." },
  phone: { title: "Sign in with your phone", text: "We'll text a 6-digit code to your mobile number." },
  register: { title: "Create your Farmer Account", text: "Join Local Mart Farmer Program and take your farm to the local market." },
};

/** What a new account's password needs, shown ticked off as it is typed. */
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Includes a number or symbol", test: (p: string) => /[^A-Za-z]/.test(p) },
];

const FEATURES = [
  { icon: ShoppingCart, title: "Sell Locally", text: "Reach buyers in your area" },
  { icon: ChartColumn, title: "Record Farm Data", text: "Track crops, area, and harvest" },
  { icon: Sprout, title: "Get Better Opportunities", text: "Link to buyers, partners, and support programs" },
];

// The figures from the Farmer Program design.
const STATS = [
  { icon: UsersRound, label: "Farmers Network", value: "10,000+" },
  { icon: ShoppingBasket, label: "Crops Listed", value: "50+" },
  { icon: Store, label: "Local Buyers", value: "500+" },
];

export default function Login() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("email");
  const { busy, run } = useAction();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState<ConfirmationResult | null>(null);

  if (auth.farmer) return <Navigate to="/" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (mode === "email") return auth.signInWithEmail(email.trim(), password);
      if (mode === "register") {
        if (!PASSWORD_RULES.every((rule) => rule.test(password))) {
          throw new Error("Use a password of at least 8 characters with a number or symbol");
        }
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

  const choose = (m: Mode) => {
    setMode(m);
    setOtp(null);
  };

  const submitLabel =
    mode === "email" ? "Sign In" : mode === "register" ? "Create Account" : otp ? "Verify and Sign In" : "Send Code";

  return (
    <div className="farmer-login relative isolate flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      {/* Fields at the top and tea leaves at the foot, fading into the page colour. */}
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-80 bg-cover bg-center" style={{ backgroundImage: `url(${fieldsPhoto})` }}>
        <div className="absolute inset-0 bg-linear-to-b from-background/0 via-background/40 to-background dark:from-background/30 dark:via-background/60" />
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-cover bg-bottom opacity-50 dark:opacity-100" style={{ backgroundImage: `url(${leavesPhoto})` }}>
        <div className="absolute inset-0 bg-linear-to-b from-background to-transparent" />
      </div>

      <div className="absolute top-4 right-4 z-20 rounded-lg bg-background/70 backdrop-blur">
        <ThemeToggle />
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 pt-16 pb-10 sm:px-6 lg:pt-20">
        {/* Dark green in both themes; only the form panel inside it follows the theme. */}
        <div className="grid overflow-hidden rounded-3xl border border-(--brand-border) bg-(--brand) text-white shadow-[0_0_80px_-24px_rgba(163,230,53,0.45)] backdrop-blur-md lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <section className="flex flex-col">
            <div className="grid gap-6 px-6 pt-7 sm:px-9 sm:pt-9 lg:gap-8 lg:px-12 lg:pt-12">
              <div className="flex items-center gap-3">
                <Leaf className="size-11 fill-(--brand-accent) text-green-950" strokeWidth={1.5} />
                <div className="leading-tight">
                  <p className="text-2xl font-semibold">Local Mart</p>
                  <p className="text-lg text-white/80">Farmer Program</p>
                </div>
              </div>
              <div className="grid gap-4">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.25rem] lg:leading-[1.2]">
                  From Your Farm
                  <br />
                  to <span className="text-(--brand-accent)">Your Local Market</span>
                </h1>
                <p className="max-w-md text-white/75 sm:text-lg">
                  A digital platform that connects farmers, collects farm data, and helps you sell your produce in nearby markets.
                </p>
              </div>
              <ul className="hidden gap-5 lg:grid">
                {FEATURES.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-center gap-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5">
                      <Icon className="size-6 text-(--brand-accent)" />
                    </span>
                    <span>
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-sm text-white/70">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1" />
            {/* Its top and right edges fade into the card. */}
            <img src={farmerPhoto} alt="" width={460} height={428} className="mt-4 hidden w-full mask-t-from-85% mask-r-from-93% lg:block" />
          </section>

          <section className="relative z-10 m-3 flex flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl backdrop-blur-xl sm:m-6 sm:p-8 lg:my-8 lg:mr-8 lg:ml-0">
            <header className="grid gap-2">
              <h2 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">{HEADINGS[mode].title}</h2>
              <p className="text-muted-foreground">{HEADINGS[mode].text}</p>
            </header>

            <div role="group" aria-label="How to sign in" className="mt-6 grid grid-cols-3 gap-1 rounded-xl border border-input p-1 dark:bg-input/20">
              {TABS.map(({ mode: m, label, icon: Icon }) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => choose(m)}
                  className={cn(
                    "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/85 hover:bg-muted",
                  )}>
                  <Icon className="hidden size-4 min-[400px]:block" />
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-6 grid gap-5">
              {(mode === "register" || (mode === "phone" && !otp)) && (
                <Field id="name" label="Full Name" icon={User} required={mode === "register"}>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder={mode === "register" ? "Enter your name" : "Only needed for a new account"}
                    required={mode === "register"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl px-4"
                  />
                </Field>
              )}
              {mode !== "phone" && (
                <>
                  <Field id="email" label="Email" icon={Mail} required>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="username"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl px-4"
                    />
                  </Field>
                  <Field id="password" label="Password" icon={Lock} required>
                    <PasswordInput
                      id="password"
                      required
                      minLength={mode === "register" ? 8 : 6}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      placeholder={mode === "register" ? "Create a password" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      groupClassName="h-11 rounded-xl"
                      className="pl-4"
                    />
                    {mode === "register" && (
                      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                        {PASSWORD_RULES.map(({ label, test }) => {
                          const met = test(password);
                          return (
                            <li key={label} className={cn("flex items-center gap-1.5", met && "text-foreground")}>
                              {met ? <Check className="size-4 text-(--highlight)" /> : <Circle className="m-0.5 size-3" />}
                              {label}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Field>
                </>
              )}
              {(mode === "phone" || mode === "register") && (
                <Field id="phone" label="Mobile Number" icon={Phone} required>
                  <div className="flex gap-3">
                    <span className="flex h-11 shrink-0 items-center rounded-xl border border-input px-4 text-sm font-medium dark:bg-input/30">+91</span>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      required
                      disabled={otp !== null}
                      placeholder="Enter mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      className="h-11 rounded-xl px-4"
                    />
                  </div>
                </Field>
              )}
              {mode === "phone" && otp && (
                <Field id="code" label="SMS Code" icon={KeyRound} required>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    placeholder="6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-11 rounded-xl px-4"
                  />
                </Field>
              )}
              <Button type="submit" disabled={busy} className="mt-1 h-12 rounded-xl text-base font-semibold">
                {busy ? "Please wait…" : submitLabel}
                {!busy && <ArrowRight className="size-5" />}
              </Button>
            </form>
            <div id="recaptcha" />

            <div className="my-5 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => run(async () => auth.signInWithGoogle(await googleIdToken()))}
              className="h-12 rounded-xl bg-transparent text-base font-semibold dark:bg-transparent">
              <GoogleLogo className="size-5" />
              Continue with Google
            </Button>

            <div className="mt-auto grid gap-5 pt-6">
              <p className="text-center text-sm text-muted-foreground">
                {mode === "register" ? "Already have an account?" : "New to the Farmer Program?"}{" "}
                <button
                  type="button"
                  onClick={() => choose(mode === "register" ? "email" : "register")}
                  className="font-semibold text-(--highlight) underline-offset-4 hover:underline">
                  {mode === "register" ? "Sign in" : "Create an account"}
                </button>
              </p>
              <p className="mx-auto flex max-w-xs items-start gap-3 text-sm text-muted-foreground">
                <ShieldCheck className="size-5 shrink-0 text-(--highlight)" />
                Your data is safe and used only for the Farmer Program services.
              </p>
            </div>
          </section>
        </div>

        <ul className="mx-auto mt-10 grid w-full max-w-2xl grid-cols-3 divide-x divide-border">
          {STATS.map(({ icon: Icon, label, value }) => (
            <li key={label} className="flex flex-col items-center gap-2 px-2 sm:flex-row sm:justify-center sm:gap-4">
              <Icon className="size-7 shrink-0 text-foreground/80 sm:size-9" strokeWidth={1.5} />
              <span className="text-center sm:text-left">
                <span className="block text-xs text-muted-foreground sm:text-sm">{label}</span>
                <span className="block text-lg font-bold text-(--highlight) sm:text-2xl">{value}</span>
              </span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

/** A label with its icon (and a red star when required) over its input. */
function Field({ id, label, icon: Icon, required, children }: { id: string; label: string; icon: LucideIcon; required?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        <Icon className="size-4 text-foreground/80" />
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}

/** Google's "G", for the Continue with Google button. */
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
