import { useCallback, useEffect, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Hash,
  House,
  Info,
  Landmark,
  LandPlot,
  Map as MapIcon,
  MapPin,
  Pencil,
  Ruler,
  Sprout,
  Tractor,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { LandSizeGuide } from "@/components/LandSizeGuide";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LAND_UNITS, getFarm, saveFarm, type Farm as FarmData, type LandUnit } from "@/lib/farm";
import { SQ_FT, UNIT_LABEL, formatArea, formatAssam } from "@/lib/land";
import { ASSAM_DISTRICTS, DEFAULT_STATE, INDIAN_STATES } from "@/lib/places";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

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

/** What the form opens with: the saved details, with the state filled in when there is none yet. */
const toEdit = (f: FarmForm): FarmForm => ({ ...f, state: f.state || DEFAULT_STATE });

/** True once the farmer has saved anything: their details are then shown, not the form. */
const hasDetails = (f: FarmForm): boolean =>
  [f.addressLine, f.village, f.district, f.state, f.pincode, f.landSize].some((v) => v.trim() !== "");

/** The typed land size, or null while it is empty or not a number above 0. */
const sizeOf = (f: FarmForm): number | null => {
  const size = Number(f.landSize);
  return f.landSize.trim() !== "" && size > 0 ? size : null;
};

/** "1 acre (3 bigha 2.5 lecha)": the size as entered, with Assam's units when they say something new. */
const landText = (f: FarmForm): string => {
  const size = sizeOf(f);
  if (size === null) return "";
  const entered = `${formatArea(size)} ${f.landUnit}`;
  const assam = formatAssam(size * SQ_FT[f.landUnit as LandUnit]);
  return assam === entered ? entered : `${entered} (${assam})`;
};

const STEPS = [
  { to: "/", title: "Farm Details", text: "Location and land info", icon: MapPin },
  { to: "/crops", title: "Crop Details", text: "What you grow", icon: Sprout },
];

/** Where the farmer is in filling in their profile: this page, then their crops. */
function Steps({ farmDone }: { farmDone: boolean }) {
  return (
    <ol aria-label="Profile steps" className="grid grid-cols-2 gap-2 lg:sticky lg:top-28 lg:grid-cols-1 lg:gap-0">
      {STEPS.map(({ to, title, text, icon: Icon }, i) => {
        const current = i === 0;
        const body = (
          <>
            <span
              className={cn(
                "relative grid size-10 shrink-0 place-items-center rounded-full border",
                current ? "border-transparent bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
              )}>
              <Icon className="size-5" />
              {current && farmDone && (
                <span className="absolute -right-1 -bottom-1 grid size-4.5 place-items-center rounded-full bg-highlight text-background ring-2 ring-card">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold sm:text-base">{title}</span>
              <span className="block text-xs text-muted-foreground sm:text-sm">{text}</span>
            </span>
          </>
        );
        return (
          <li key={to} className="relative">
            {/* The line joining the steps, on wide screens where they stack. */}
            {i > 0 && <span aria-hidden className="absolute -top-3 left-[2.2rem] hidden h-6 w-0.5 rounded bg-border lg:block" />}
            {current ? (
              <div aria-current="step" className="flex items-center gap-3 rounded-xl border bg-accent/60 p-3 lg:mb-6">
                {body}
              </div>
            ) : (
              <Link to={to} className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/60">
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A label with an optional red star, over its input. */
function Field({ id, label, required, wide, children }: { id: string; label: string; required?: boolean; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("grid gap-2", wide && "sm:col-span-2")}>
      <Label htmlFor={id} className="text-[0.95rem]">
        {label}
        {required && (
          <span aria-hidden className="-ml-1 text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}

function Detail({ icon: Icon, label, value, wide = false }: { icon: LucideIcon; label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("grid content-start gap-1 rounded-xl border bg-muted/40 p-3 sm:p-3.5", wide && "col-span-2")}>
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0 text-highlight" />
        {label}
      </dt>
      <dd className="font-medium break-words">{value.trim() || <span className="font-normal text-muted-foreground">Not given</span>}</dd>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2.5 text-lg font-semibold">
      <Icon className="size-5 text-highlight" />
      {children}
    </h3>
  );
}

export default function Farm() {
  // What the server holds: null while loading.
  const [saved, setSaved] = useState<FarmForm | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const { busy, run } = useAction();
  const navigate = useNavigate();

  const load = useCallback(() => {
    getFarm()
      .then((f) => {
        const data = toForm(f);
        setSaved(data);
        setForm(toEdit(data));
        // A farm with nothing saved yet opens straight in the form.
        setEditing(!hasDetails(data));
      })
      .catch((e: Error) => {
        setLoadFailed(true);
        toast.error(e.message);
      });
  }, []);

  useEffect(load, [load]);

  // The first save carries on to the next step, the crops.
  const firstTime = saved !== null && !hasDetails(saved);

  const field = (key: keyof FarmForm, icon: LucideIcon, extra: ComponentProps<typeof InputGroupInput> = {}) => {
    const Icon = icon;
    return (
      <InputGroup className="h-12 rounded-xl sm:h-11">
        <InputGroupAddon className="pl-3.5">
          <Icon className="size-5" />
        </InputGroupAddon>
        <InputGroupInput id={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...extra} />
      </InputGroup>
    );
  };

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
      setForm(toEdit(data));
      setEditing(false);
      if (firstTime) {
        toast.success("Farm details saved. Now add what you grow.");
        navigate("/crops");
      } else {
        toast.success("Farm details saved");
      }
    }, "Could not save");
  }

  const cancel = () => {
    if (saved) setForm(toEdit(saved));
    setEditing(false);
  };

  let body: ReactNode;
  if (loadFailed) {
    body = (
      <div className="grid justify-items-start gap-3 p-4 text-sm sm:p-6">
        <p className="text-muted-foreground">Your farm details could not be loaded.</p>
        <Button
          variant="outline"
          className="h-10"
          onClick={() => {
            setLoadFailed(false);
            load();
          }}>
          Try again
        </Button>
      </div>
    );
  } else if (!saved) {
    body = (
      <div className="grid gap-3 p-4 sm:p-6">
        <Skeleton className="h-11 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
        <Skeleton className="h-11 w-1/2" />
      </div>
    );
  } else if (!editing) {
    body = (
      <div className="grid gap-6 p-4 sm:p-6">
        {/* Two to a row even on phones, so the details fit on one screen. */}
        <dl className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <Detail icon={MapPin} label="Address / Locality" value={saved.addressLine} wide />
          <Detail icon={House} label="Village / Town" value={saved.village} />
          <Detail icon={Landmark} label="District" value={saved.district} />
          <Detail icon={MapIcon} label="State" value={saved.state} />
          <Detail icon={Hash} label="Pincode" value={saved.pincode} />
        </dl>
        <div className="grid gap-4 border-t pt-6">
          <SectionTitle icon={LandPlot}>Land Details</SectionTitle>
          <dl className="grid">
            <Detail icon={Ruler} label="Total land" value={landText(saved)} />
          </dl>
          <LandSizeGuide size={sizeOf(saved)} unit={saved.landUnit as LandUnit} />
        </div>
      </div>
    );
  } else {
    body = (
      <>
        {/* The guide sits between the fields and the save bar but outside the form, so its buttons can't submit it. */}
        <form id="farm-form" onSubmit={submit} className="grid gap-6 p-4 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="addressLine" label="Address / Locality" required wide>
              {field("addressLine", MapPin, { required: true, autoComplete: "street-address", placeholder: "e.g. Borpukhuri, Ward No. 3" })}
            </Field>
            <Field id="village" label="Village / Town" required>
              {field("village", House, { required: true, placeholder: "Enter village or town" })}
            </Field>
            <Field id="district" label="District" required>
              {field("district", Landmark, { required: true, list: "assam-districts", autoComplete: "off", placeholder: "Pick or type your district" })}
            </Field>
            <Field id="state" label="State" required>
              {field("state", MapIcon, { required: true, list: "indian-states", autoComplete: "off", placeholder: "Enter state" })}
            </Field>
            <Field id="pincode" label="Pincode">
              {field("pincode", Hash, {
                inputMode: "numeric",
                autoComplete: "postal-code",
                maxLength: 6,
                pattern: "\\d{6}",
                title: "6 digits",
                placeholder: "6-digit pincode",
              })}
            </Field>
            <datalist id="assam-districts">
              {ASSAM_DISTRICTS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <datalist id="indian-states">
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-5 border-t pt-6">
            <SectionTitle icon={LandPlot}>Land Details</SectionTitle>
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
              <Field id="landSize" label="Total Land Size" required>
                {field("landSize", Ruler, { type: "number", inputMode: "decimal", min: 0, step: "any", required: true, placeholder: "e.g. 2.5" })}
              </Field>
              <Field id="landUnit" label="Unit" required>
                <div className="relative">
                  <select
                    id="landUnit"
                    required
                    className="h-12 w-full appearance-none rounded-xl border border-input bg-transparent pr-10 pl-4 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-11 sm:text-sm dark:bg-input/30"
                    value={form.landUnit}
                    onChange={(e) => setForm({ ...form, landUnit: e.target.value })}>
                    {LAND_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {UNIT_LABEL[u]} ({formatArea(SQ_FT[u])} sq ft)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </Field>
            </div>
          </div>
        </form>

        <div className="px-4 pb-6 sm:px-6">
          <LandSizeGuide size={sizeOf(form)} unit={form.landUnit as LandUnit} />
        </div>

        {/* Stays in view while the form scrolls: above the tab bar on phones, at the bottom of the screen on wider ones. */}
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-3 rounded-b-2xl border-t bg-card/95 p-4 backdrop-blur-md sm:px-6 lg:bottom-0">
          <p className="hidden flex-1 items-center gap-2 text-sm text-muted-foreground sm:flex">
            <Info className="size-4 shrink-0" />
            {firstTime ? "You can add your crops in the next step." : "Your changes are kept once you save."}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            {!firstTime && (
              <Button type="button" variant="outline" disabled={busy} onClick={cancel} className="h-12 flex-1 rounded-xl sm:h-11 sm:flex-none sm:px-5">
                Cancel
              </Button>
            )}
            <Button type="submit" form="farm-form" disabled={busy} className="h-12 flex-1 rounded-xl text-base font-semibold sm:h-11 sm:flex-none sm:px-6">
              {busy ? "Saving…" : firstTime ? "Save & Continue" : "Save changes"}
              {!busy && <ArrowRight className="size-5" />}
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="grid gap-5 lg:gap-6">
      <PageHeader
        title="Farm Profile"
        text="Add details about your farm and land. This helps buyers find produce from your area and gives you better market opportunities."
      />
      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <Steps farmDone={saved !== null && hasDetails(saved)} />
        <section aria-labelledby="farm-details" className="rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="flex items-start gap-3 p-4 pb-0 sm:gap-4 sm:p-6 sm:pb-0">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-highlight">
              <Tractor className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="farm-details" className="text-xl font-semibold sm:text-2xl">
                Farm Details
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">Where your farm is and how much land you have.</p>
            </div>
            {saved && !editing && (
              <Button
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => {
                  setForm(toEdit(saved));
                  setEditing(true);
                }}>
                <Pencil /> Edit
              </Button>
            )}
          </div>
          {body}
        </section>
      </div>
    </div>
  );
}
