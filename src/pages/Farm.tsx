import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LAND_UNITS, getFarm, saveFarm, type Farm as FarmData } from "@/lib/farm";
import { useAction } from "@/lib/use-action";

const EMPTY = { addressLine: "", village: "", district: "", state: "", pincode: "", landSize: "", landUnit: "acre" };
type FarmForm = typeof EMPTY;

const toForm = (f: FarmData): FarmForm => ({
  addressLine: f.addressLine ?? "",
  village: f.village ?? "",
  district: f.district ?? "",
  state: f.state ?? "",
  pincode: f.pincode ?? "",
  landSize: f.landSize?.toString() ?? "",
  landUnit: f.landUnit,
});

/** True once the farmer has saved anything: their details are then shown, not the form. */
const hasDetails = (f: FarmForm): boolean =>
  [f.addressLine, f.village, f.district, f.state, f.pincode, f.landSize].some((v) => v.trim() !== "");

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value.trim() || <span className="font-normal text-muted-foreground">Not given</span>}</dd>
    </div>
  );
}

export default function Farm() {
  // What the server holds: null while loading.
  const [saved, setSaved] = useState<FarmForm | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const { busy, run } = useAction();

  const load = useCallback(() => {
    getFarm()
      .then((f) => {
        const data = toForm(f);
        setSaved(data);
        setForm(data);
        // A farm with nothing saved yet opens straight in the form.
        setEditing(!hasDetails(data));
      })
      .catch((e: Error) => {
        setLoadFailed(true);
        toast.error(e.message);
      });
  }, []);

  useEffect(load, [load]);

  const field = (key: keyof FarmForm, label: string, extra: React.ComponentProps<typeof Input> = {}) => (
    <div className="grid gap-2">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...extra} />
    </div>
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const updated = await saveFarm({
        ...form,
        landSize: form.landSize === "" ? undefined : Number(form.landSize),
        landUnit: form.landUnit as FarmData["landUnit"],
      });
      // Show what the server kept, not what was typed.
      const data = toForm(updated);
      setSaved(data);
      setForm(data);
      setEditing(false);
      toast.success("Farm details saved");
    }, "Could not save");
  }

  const cancel = () => {
    if (saved) setForm(saved);
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Farm profile</CardTitle>
        <CardDescription>Where your farm is and how much land you have.</CardDescription>
        {saved && !editing && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> Edit
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {loadFailed ? (
          <div className="grid justify-items-start gap-3 text-sm">
            <p className="text-muted-foreground">Your farm details could not be loaded.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoadFailed(false);
                load();
              }}>
              Try again
            </Button>
          </div>
        ) : !saved ? (
          <div className="grid gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ) : !editing ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Address" value={saved.addressLine} wide />
            <Detail label="Village / town" value={saved.village} />
            <Detail label="District" value={saved.district} />
            <Detail label="State" value={saved.state} />
            <Detail label="Pincode" value={saved.pincode} />
            <Detail label="Land size" value={saved.landSize ? `${saved.landSize} ${saved.landUnit}` : ""} />
          </dl>
        ) : (
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
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
              {hasDetails(saved) && (
                <Button type="button" variant="ghost" disabled={busy} onClick={cancel}>Cancel</Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
