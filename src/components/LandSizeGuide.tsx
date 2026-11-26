import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { LandUnit } from "@/lib/farm";
import { SQ_FT, SQ_M_PER_SQ_FT, UNIT_LABEL, formatArea, formatAssam } from "@/lib/land";

type Shown = LandUnit | "yours";

/** Smallest first, for the buttons and the outlines. */
const SIZES: LandUnit[] = ["lecha", "katha", "bigha", "acre", "hectare"];

/** A lecha is 12 × 12 ft. Assam's units are drawn as whole lecha tiles so they can be counted. */
const TILE_FT = 12;
const TILED: Partial<Record<LandUnit, [number, number]>> = {
  lecha: [12, 12],
  katha: [60, 48], // 5 × 4 tiles
  bigha: [120, 120], // 10 × 10 tiles, 5 katha bands of 2 rows
};
/** Width and height in feet; acres, hectares and the farmer's own land are squares. */
const plot = (sqFt: number, unit?: LandUnit): [number, number] =>
  (unit && TILED[unit]) || [Math.sqrt(sqFt), Math.sqrt(sqFt)];

const NOTE: Partial<Record<LandUnit, string>> = {
  lecha: "12 × 12 ft, about the size of one room.",
  katha: "20 lecha, drawn as 5 × 4 lecha tiles.",
  bigha: "5 katha or 100 lecha, drawn as 10 × 10 lecha tiles. Each shaded band of 2 rows is 1 katha.",
};

// The scene, in px. The plot's longer side settles at FIT.
const W = 360;
const H = 220;
const FIT = 160;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Follows `target` over `ms` after `delay`, in log space, so 12 ft → 328 ft glides as evenly as 12 → 24. */
function useGlide(target: number, ms: number, delay = 0): number {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = Math.log(current.current);
    const to = Math.log(target);
    if (from === to) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = still ? 1 : Math.min(1, Math.max(0, (now - start - delay) / ms));
      current.current = t === 1 ? target : Math.exp(from + (to - from) * easeInOut(t));
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms, delay]);
  return shown;
}

/** A round length of about 70 px: 5 ft, 20 ft, 100 ft… */
function scaleBar(pxPerFt: number) {
  const raw = 70 / pxPerFt;
  const step = 10 ** Math.floor(Math.log10(raw));
  const ft = [5, 2, 1].map((m) => m * step).find((v) => v <= raw) ?? step;
  return { ft, px: ft * pxPerFt };
}

/** Front view of a house 8 ft wide, centred on (cx, cy), at `s` px per foot. */
function House({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy + 4 * s} rx={5.5 * s} ry={0.8 * s} className="fill-black/15" />
      <rect x={cx - 4 * s} y={cy - 1 * s} width={8 * s} height={5 * s} className="fill-amber-50 stroke-amber-900/50" strokeWidth={1} />
      <polygon
        points={`${cx - 5 * s},${cy - 1 * s} ${cx},${cy - 5 * s} ${cx + 5 * s},${cy - 1 * s}`}
        className="fill-red-700 dark:fill-red-500"
      />
      <rect x={cx - 0.9 * s} y={cy + 1.2 * s} width={1.8 * s} height={2.8 * s} className="fill-amber-800" />
      <rect x={cx - 3.2 * s} y={cy + 0.6 * s} width={1.4 * s} height={1.2 * s} className="fill-sky-300" />
      <rect x={cx + 1.8 * s} y={cy + 0.6 * s} width={1.4 * s} height={1.2 * s} className="fill-sky-300" />
    </g>
  );
}

/**
 * A house with land around it, sized to 1 lecha, katha, bigha, acre or hectare, or to the size the
 * farmer typed, with that size worked out in every unit.
 */
export function LandSizeGuide({ size, unit }: { size: number | null; unit: LandUnit }) {
  const yours = size !== null && Number.isFinite(size) && size > 0 ? size * SQ_FT[unit] : null;

  // Typing a new size goes back to showing the farmer's own land.
  const typed = `${size}|${unit}`;
  const [seenTyped, setSeenTyped] = useState(typed);
  const [chosen, setChosen] = useState<Shown | null>(null);
  if (seenTyped !== typed) {
    setSeenTyped(typed);
    setChosen(null);
  }
  const shown: Shown = chosen ?? (yours ? "yours" : "bigha");
  const tiled = shown === "lecha" || shown === "katha" || shown === "bigha";

  const sqFt = shown === "yours" ? (yours ?? SQ_FT.bigha) : SQ_FT[shown];
  const [targetW, targetH] = plot(sqFt, shown === "yours" ? undefined : shown);

  // The land moves first and the view follows, so a bigger plot spills past the edges before the view pulls back.
  const w = useGlide(targetW, 700);
  const h = useGlide(targetH, 700);
  const span = useGlide(Math.max(targetW, targetH), 700, 140);

  const k = FIT / span; // px per foot
  const pw = w * k;
  const ph = h * k;
  const x0 = (W - pw) / 2;
  const y0 = (H - ph) / 2;
  const tile = TILE_FT * k;
  const lines = (length: number) =>
    tile >= 4 ? Array.from({ length: Math.ceil(length / tile) - 1 }, (_, i) => (i + 1) * tile) : [];
  const bands = tile >= 4 ? Array.from({ length: Math.ceil(ph / (4 * tile)) }, (_, i) => i * 4 * tile) : [];
  const outlines = SIZES.filter((u) => SQ_FT[u] < sqFt * 0.95)
    .map((u) => {
      const [rw, rh] = plot(SQ_FT[u], u);
      return { u, rw: rw * k, rh: rh * k };
    })
    .filter((o) => Math.max(o.rw, o.rh) >= 16);
  const bar = scaleBar(k);

  const title = shown === "yours" ? `Your land: ${formatArea(size ?? 0)} ${unit}` : `1 ${UNIT_LABEL[shown]}`;
  const note =
    (shown !== "yours" && NOTE[shown]) ||
    `${formatAssam(sqFt)}. Drawn as a square of about ${formatArea(targetW)} × ${formatArea(targetW)} ft.`;
  const conversions: [string, number, boolean][] = [
    ...SIZES.map((u): [string, number, boolean] => [UNIT_LABEL[u], sqFt / SQ_FT[u], u === (shown === "yours" ? unit : shown)]),
    ["Sq ft", sqFt, false],
    ["Sq m", sqFt * SQ_M_PER_SQ_FT, false],
  ];

  return (
    <figure className="@container grid gap-3 rounded-xl border p-3">
      <div className="grid gap-1">
        <h3 className="font-medium">How big is it?</h3>
        <p className="text-sm text-muted-foreground">
          1 bigha = 5 katha = 100 lecha. Pick a size to see it to scale around a small house, 8 ft wide.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Land size to show">
        {yours && (
          <Button size="sm" variant={shown === "yours" ? "default" : "outline"} aria-pressed={shown === "yours"} onClick={() => setChosen("yours")}>
            Your land
          </Button>
        )}
        {SIZES.map((u) => (
          <Button key={u} size="sm" variant={shown === u ? "default" : "outline"} aria-pressed={shown === u} onClick={() => setChosen(u)}>
            1 {UNIT_LABEL[u]}
          </Button>
        ))}
      </div>

      {/* The drawing keeps its proportions, so on wide cards it sits beside the numbers instead of growing tall. */}
      <div className="grid items-start gap-3 @xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @xl:gap-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full overflow-hidden rounded-lg"
          role="img"
          aria-label={`${title}, drawn around a house. ${note}`}>
          <rect width={W} height={H} className="fill-lime-100 dark:fill-lime-950" />

          <rect x={x0} y={y0} width={pw} height={ph} className="fill-green-200 dark:fill-green-900" />
          <g className={`transition-opacity duration-500 ${shown === "bigha" ? "opacity-100" : "opacity-0"}`}>
            {bands.map((y) => (
              <rect key={y} x={x0} y={y0 + y} width={pw} height={Math.min(2 * tile, ph - y)} className="fill-green-300/80 dark:fill-green-700/70" />
            ))}
          </g>
          <g className={`transition-opacity duration-500 ${tiled ? "opacity-100" : "opacity-0"}`} strokeWidth={1}>
            {lines(pw).map((x) => (
              <line key={`x${x}`} x1={x0 + x} x2={x0 + x} y1={y0} y2={y0 + ph} className="stroke-green-900/25 dark:stroke-green-100/20" />
            ))}
            {lines(ph).map((y) => (
              <line key={`y${y}`} x1={x0} x2={x0 + pw} y1={y0 + y} y2={y0 + y} className="stroke-green-900/25 dark:stroke-green-100/20" />
            ))}
          </g>
          <g className={`transition-opacity duration-500 ${tiled ? "opacity-0" : "opacity-100"}`}>
            {outlines.map(({ u, rw, rh }) => (
              <g key={u}>
                <rect
                  x={(W - rw) / 2}
                  y={(H - rh) / 2}
                  width={rw}
                  height={rh}
                  fill="none"
                  strokeWidth={1.25}
                  strokeDasharray="4 3"
                  className="stroke-green-950/60 dark:stroke-green-50/60"
                />
                {rw >= 40 && (
                  <text
                    x={(W - rw) / 2 + 4}
                    y={(H - rh) / 2 + 11}
                    fontSize={10}
                    strokeWidth={3}
                    paintOrder="stroke"
                    className="fill-green-950 stroke-green-200 font-medium dark:fill-green-50 dark:stroke-green-900">
                    1 {u}
                  </text>
                )}
              </g>
            ))}
          </g>
          <rect x={x0} y={y0} width={pw} height={ph} fill="none" strokeWidth={2} className="stroke-amber-700 dark:stroke-amber-500" />

          {/* True to scale, however small; a ring marks it when it shrinks to a few pixels. */}
          <House cx={W / 2} cy={H / 2} s={k} />
          {8 * k < 9 && (
            <circle cx={W / 2} cy={H / 2} r={7} fill="none" strokeWidth={1.25} strokeDasharray="2 2" className="stroke-foreground/70" />
          )}

          <g className="stroke-foreground/70" strokeWidth={1.5}>
            <line x1={12} x2={12 + bar.px} y1={H - 12} y2={H - 12} />
            <line x1={12} x2={12} y1={H - 16} y2={H - 8} />
            <line x1={12 + bar.px} x2={12 + bar.px} y1={H - 16} y2={H - 8} />
          </g>
          <text x={12} y={H - 20} fontSize={10} strokeWidth={3} paintOrder="stroke" className="fill-foreground stroke-lime-100 dark:stroke-lime-950">
            {formatArea(bar.ft)} ft
          </text>
        </svg>

        <div className="grid gap-3 text-sm">
          <p>
            <span className="font-medium">{title}</span> <span className="text-muted-foreground">= {note}</span>
          </p>
          <dl className="grid grid-cols-2 gap-1.5 @md:grid-cols-4 @xl:grid-cols-2">
            {conversions.map(([label, value, own]) => (
              <div key={label} className={`rounded-lg border px-2.5 py-1.5 ${own ? "border-primary bg-muted" : ""}`}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums">{formatArea(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </figure>
  );
}
