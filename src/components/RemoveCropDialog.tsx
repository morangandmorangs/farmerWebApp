import type { ConfirmationResult } from "firebase/auth";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/PasswordInput";
import { useAuth } from "@/lib/auth";
import { removeCrop, type RemoveProof } from "@/lib/farm";
import { confirmOtp, googleIdToken, sendOtp } from "@/lib/firebase";
import { useAction } from "@/lib/use-action";

/** "+91 ••••••3210": enough for the farmer to recognise their number. */
const masked = (tenDigits: string) => `+91 ••••••${tenDigits.slice(-4)}`;

/**
 * Removing a crop deletes it for good, so the farmer proves it's them first,
 * the way they sign in: a password for an email account, an SMS code for a
 * phone account, the Google account picker for a Google one.
 *
 * Render with a `key` per crop so each opening starts empty.
 */
export default function RemoveCropDialog({
  crop,
  onCancel,
  onRemoved,
}: {
  /** The crop being removed, or null when the dialog is closed. */
  crop: { id: string; name: string } | null;
  onCancel: () => void;
  onRemoved: () => Promise<void>;
}) {
  const { farmer } = useAuth();
  const { busy, run } = useAction();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState<ConfirmationResult | null>(null);
  // Shown in the dialog, not as a toast, so a wrong password reads as part of the form.
  const [error, setError] = useState<string | null>(null);

  const method = farmer?.provider === "phone" ? "phone" : farmer?.provider === "google" ? "google" : "password";
  const phone = farmer?.phoneNumber?.replace(/\D/g, "").slice(-10) ?? "";

  const attempt = (step: () => Promise<void>) =>
    run(async () => {
      setError(null);
      try {
        await step();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });

  const remove = async (proof: RemoveProof) => {
    if (!crop) return;
    await removeCrop(crop.id, proof);
    await onRemoved();
    toast.success(`${crop.name} removed`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void attempt(async () => {
      if (method === "password") return remove({ password });
      if (!otp) {
        setOtp(await sendOtp(phone, "remove-crop-recaptcha"));
        toast.success("Code sent by SMS");
        return;
      }
      return remove({ idToken: await confirmOtp(otp, code.trim()) });
    });
  };

  return (
    <Dialog open={crop !== null} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {crop?.name}?</DialogTitle>
          <DialogDescription>
            The crop record is deleted for good.{" "}
            {method === "password"
              ? "Enter your password to confirm."
              : method === "phone"
                ? `We'll send a code to ${masked(phone)} to confirm.`
                : "Choose your Google account again to confirm."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          {method === "password" && (
            <div className="grid gap-2">
              <Label htmlFor="remove-password">Password</Label>
              <PasswordInput
                id="remove-password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {method === "phone" && otp && (
            <div className="grid gap-2">
              <Label htmlFor="remove-code">SMS code</Label>
              <Input
                id="remove-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div id="remove-crop-recaptcha" />

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
            {method === "google" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => attempt(async () => remove({ idToken: await googleIdToken() }))}>
                {busy ? "Please wait…" : "Confirm with Google"}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="destructive"
                disabled={busy || (method === "password" ? password === "" : otp !== null && code.length < 6)}>
                {busy ? "Please wait…" : method === "phone" && !otp ? "Send code" : "Remove"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
