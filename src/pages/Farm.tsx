import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LAND_UNITS, getFarm, saveFarm, type Farm as FarmData } from "@/lib/farm";

const EMPTY = { addressLine: "", village: "", district: "", state: "", pincode: "", landSize: "", landUnit: "acre" };

export default function Farm() {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFarm()
      .then((f) =>
        setForm({
          addressLine: f.addressLine ?? "",
          village: f.village ?? "",
          district: f.district ?? "",
          state: f.state ?? "",
          pincode: f.pincode ?? "",
          landSize: f.landSize?.toString() ?? "",
          landUnit: f.landUnit,
        }),
      )
      .catch((e: Error) => toast.error(e.message));
  }, []);

  const field = (key: keyof typeof EMPTY, label: string, extra: React.ComponentProps<typeof Input> = {}) => (
    <div className="grid gap-2">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...extra} />
    </div>
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveFarm({
        ...form,
        landSize: form.landSize === "" ? undefined : Number(form.landSize),
        landUnit: form.landUnit as FarmData["landUnit"],
      });
      toast.success("Farm details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Farm profile</CardTitle>
        <CardDescription>Where your farm is and how much land you have.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{field("addressLine", "Address")}</div>
          {field("village", "Village / town")}
          {field("district", "District")}
          {field("state", "State")}
          {field("pincode", "Pincode", { inputMode: "numeric", maxLength: 6 })}
          {field("landSize", "Land size", { type: "number", min: 0, step: "any" })}
          <div className="grid gap-2">
            <Label htmlFor="landUnit">Unit</Label>
            <select
              id="landUnit"
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.landUnit}
              onChange={(e) => setForm({ ...form, landUnit: e.target.value })}>
              {LAND_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
