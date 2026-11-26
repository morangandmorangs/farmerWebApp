import type { LandUnit } from "./farm";

/** Square feet in one of each unit. Assam's: 1 lecha = 144 sq ft, 20 lechas = 1 katha, 5 kathas = 1 bigha. */
export const SQ_FT: Record<LandUnit, number> = {
  lecha: 144,
  katha: 2_880,
  bigha: 14_400,
  acre: 43_560,
  hectare: 10_000 / 0.09290304, // 1,07,639.1 sq ft
};

export const SQ_M_PER_SQ_FT = 0.09290304;

export const UNIT_LABEL: Record<LandUnit, string> = {
  lecha: "Lecha",
  katha: "Katha",
  bigha: "Bigha",
  acre: "Acre",
  hectare: "Hectare",
};

const formats = [0, 1, 2, 3].map((digits) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: digits }));

/** Fewer decimals as numbers grow: 43,560 · 1,337.8 · 267.56 · 3.025. */
export const formatArea = (n: number): string => {
  const abs = Math.abs(n);
  return formats[abs >= 10_000 ? 0 : abs >= 1_000 ? 1 : abs >= 10 ? 2 : 3].format(n);
};

/** "3 bigha 2.5 lecha": land as it is spoken of in Assam, to a tenth of a lecha. Zero parts are left out. */
export const formatAssam = (sqFt: number): string => {
  const tenths = Math.round((sqFt / SQ_FT.lecha) * 10);
  if (tenths === 0) return "under 0.1 lecha";
  const bigha = Math.floor(tenths / 1_000);
  const katha = Math.floor((tenths % 1_000) / 200);
  const lecha = (tenths % 200) / 10;
  return [
    bigha && `${formats[0].format(bigha)} bigha`,
    katha && `${katha} katha`,
    lecha && `${lecha} lecha`,
  ]
    .filter(Boolean)
    .join(" ");
};
