import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import RemoveCropDialog from "@/components/RemoveCropDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCrop, cropCatalog, getFarm, markHarvested, type CropOption, type CropRecord } from "@/lib/farm";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/use-action";

const DAY = 86_400_000;
const today = () => new Date().toISOString().slice(0, 10);

/** Days until harvest, rounded up; negative once it is due. */
const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / DAY);

function readiness(c: CropRecord) {
  if (c.harvestedOn) return { label: "Harvested", variant: "outline" as const };
  const d = daysLeft(c.expectedHarvestOn);
  if (d <= 0) return { label: "Ready to harvest", variant: "default" as const };
  return { label: `${d} day${d === 1 ? "" : "s"} to go`, variant: "secondary" as const };
}

export default function Crops() {
  const [crops, setCrops] = useState<CropRecord[]>([]);
  const [options, setOptions] = useState<CropOption[]>([]);
  const [form, setForm] = useState({ crop: "", variety: "", area: "", plantedOn: today() });
  const adding = useAction();
  const updating = useAction();
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(() => getFarm().then((f) => setCrops(f.crops)), []);

  useEffect(() => {
    load().catch((e: Error) => toast.error(e.message));
    cropCatalog().then(setOptions).catch((e: Error) => toast.error(e.message));
  }, [load]);

  const label = (slug: string) => options.find((o) => o.slug === slug)?.label ?? slug;
  const chosen = options.find((o) => o.slug === form.crop);

  function submit(e: FormEvent) {
    e.preventDefault();
    void adding.run(async () => {
      await addCrop({
        crop: form.crop,
        variety: form.variety || undefined,
        area: form.area ? Number(form.area) : undefined,
        plantedOn: form.plantedOn,
      });
      setForm({ crop: "", variety: "", area: "", plantedOn: today() });
      await load();
    }, "Could not add crop");
  }

  // One row action at a time, held until the list has reloaded, so a second
  // tap can't toggle a crop twice.
  const act = (job: () => Promise<unknown>) =>
    void updating.run(async () => {
      await job();
      await load();
    });

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a crop</CardTitle>
          <CardDescription>
            {chosen ? `${chosen.label} usually takes about ${chosen.days} days from planting to harvest.` : "Pick what you planted and when. We estimate the harvest date."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="crop">Crop</Label>
              <select id="crop" required className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm" value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}>
                <option value="">Select…</option>
                {options.map((o) => (
                  <option key={o.slug} value={o.slug}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plantedOn">Planted on</Label>
              <Input id="plantedOn" type="date" required max={today()} value={form.plantedOn} onChange={(e) => setForm({ ...form, plantedOn: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="variety">Variety (optional)</Label>
              <Input id="variety" value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="area">Land under this crop (optional)</Label>
              <Input id="area" type="number" min={0} step="any" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={adding.busy}>{adding.busy ? "Adding…" : "Add crop"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">Your crops</h2>
        {crops.length === 0 && <p className="text-sm text-muted-foreground">No crops yet.</p>}
        {crops.map((c) => {
          const r = readiness(c);
          return (
            <Card key={c.id}>
              <CardContent className="flex flex-wrap items-center gap-3">
                <div className="mr-auto">
                  <div className="font-medium">
                    {label(c.crop)}
                    {c.variety ? ` · ${c.variety}` : ""}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Planted {formatDate(c.plantedOn)} · ready about {formatDate(c.expectedHarvestOn)}
                  </div>
                </div>
                <Badge variant={r.variant}>{r.label}</Badge>
                <Button size="sm" variant="outline" disabled={updating.busy} onClick={() => act(() => markHarvested(c.id, !c.harvestedOn))}>
                  {c.harvestedOn ? "Undo harvested" : "Mark harvested"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={updating.busy}
                  onClick={() => setRemoving({ id: c.id, name: `${label(c.crop)}${c.variety ? ` · ${c.variety}` : ""}` })}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <RemoveCropDialog
        key={removing?.id ?? "none"}
        crop={removing}
        onCancel={() => setRemoving(null)}
        onRemoved={async () => {
          setRemoving(null);
          await load();
        }}
      />
    </div>
  );
}
