import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const SLOTS = [
  { kind: "id-proof", label: "ID proof", hint: "Aadhaar, PAN or voter ID" },
  { kind: "land-record", label: "Land record", hint: "Khasra / 7-12 extract or lease paper" },
];

export default function Documents() {
  const { farmer, refresh } = useAuth();
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      // Upload each file first, then send the hosted URLs for review in one go.
      const documents = [];
      for (const [kind, file] of Object.entries(files)) {
        const body = new FormData();
        body.append("file", file);
        const { url } = await api<{ url: string }>("/farmers/me/documents/upload", { method: "POST", body });
        documents.push({ kind, url });
      }
      await api("/farmers/me/documents", { method: "POST", json: { documents } });
      setFiles({});
      await refresh();
      toast.success("Sent for review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>An admin reviews these before your profile is approved. JPG, PNG, WebP or PDF, up to 5 MB.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {SLOTS.map((s) => {
          const done = farmer?.documents.filter((d) => d.kind === s.kind).length ?? 0;
          return (
            <div key={s.kind} className="grid gap-1">
              <div className="font-medium">
                {s.label} {done > 0 && <span className="text-sm text-muted-foreground">({done} submitted)</span>}
              </div>
              <div className="text-sm text-muted-foreground">{s.hint}</div>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setFiles((f) => ({ ...f, [s.kind]: file }));
              }} />
            </div>
          );
        })}
        <div>
          <Button disabled={busy || Object.keys(files).length === 0} onClick={submit}>
            {busy ? "Uploading…" : "Submit for review"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
