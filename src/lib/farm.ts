import { api } from "./api";

export const LAND_UNITS = ["acre", "hectare", "bigha"] as const;

export type Farm = {
  addressLine: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  landSize: number | null;
  landUnit: (typeof LAND_UNITS)[number];
};

export type CropRecord = {
  id: string;
  crop: string;
  variety: string | null;
  area: number | null;
  plantedOn: string;
  expectedHarvestOn: string;
  harvestedOn: string | null;
};

export type CropOption = { slug: string; label: string; days: number };

export const getFarm = () => api<Farm & { crops: CropRecord[] }>("/farmers/me/farm");
export const saveFarm = (farm: Partial<Farm>) => api<Farm>("/farmers/me/farm", { method: "PUT", json: farm });
export const cropCatalog = () => api<CropOption[]>("/farmers/crop-catalog");
export const addCrop = (input: { crop: string; variety?: string; area?: number; plantedOn: string }) =>
  api<CropRecord>("/farmers/me/crops", { method: "POST", json: input });
export const markHarvested = (id: string, harvested: boolean) =>
  api<CropRecord>(`/farmers/me/crops/${id}`, { method: "PATCH", json: { harvested } });
export const removeCrop = (id: string) => api<void>(`/farmers/me/crops/${id}`, { method: "DELETE" });
