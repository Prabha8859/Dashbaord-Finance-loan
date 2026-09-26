import axiosInstance from "./axiosInstance";

// ── Types ────────────────────────────────────────────────────────────────────

export type MasterKind = "list" | "grouped" | "unknown";

export interface MasterSummary {
  _id: string;
  type: string;
  label: string;
  kind: MasterKind;
  count: number;
  createdAt: string;
  updatedAt: string;
}

export type MasterListValues = (string | number)[];
export type MasterGroupedValues = Record<string, (string | number)[]>;
export type MasterValues = MasterListValues | MasterGroupedValues;

export interface MasterDetail {
  _id: string;
  type: string;
  label: string;
  values: MasterValues;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMasterPayload {
  type: string;
  label: string;
  values?: MasterValues;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export const isGroupedValues = (values: MasterValues): values is MasterGroupedValues =>
  !Array.isArray(values);

export { getApiErrorMessage } from "../utils/apiError";

// ── Master CRUD ───────────────────────────────────────────────────────────────

/** GET /api/admin/masters — summary list { masters: [{_id, type, label, kind, count}] } */
export const getMasters = async (): Promise<MasterSummary[]> => {
  const res = await axiosInstance.get<{ success: boolean; masters: MasterSummary[] }>(
    "/masters"
  );
  return res.data.masters;
};

/** GET /api/admin/masters/:id — full detail with values */
export const getMaster = async (id: string): Promise<MasterDetail> => {
  const res = await axiosInstance.get<{ success: boolean; master: MasterDetail }>(
    `/masters/${id}`
  );
  return res.data.master;
};

/** POST /api/admin/masters — create a new master */
export const createMaster = async (payload: CreateMasterPayload): Promise<MasterDetail> => {
  const res = await axiosInstance.post<{ success: boolean; master: MasterDetail }>(
    "/masters",
    payload
  );
  return res.data.master;
};

/** PUT /api/admin/masters/:id — update master label */
export const updateMasterLabel = async (id: string, label: string): Promise<MasterDetail> => {
  const res = await axiosInstance.put<{ success: boolean; master: MasterDetail }>(
    `/masters/${id}`,
    { label }
  );
  return res.data.master;
};

/** PUT /api/admin/masters/:id/values — replace entire values array */
export const updateMasterValues = async (id: string, values: MasterValues): Promise<MasterDetail> => {
  const res = await axiosInstance.put<{ success: boolean; master: MasterDetail }>(
    `/masters/${id}/values`,
    { values }
  );
  return res.data.master;
};

/** DELETE /api/admin/masters/:id — delete a master entirely */
export const deleteMaster = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/masters/${id}`);
};

// ── States & Cities API ───────────────────────────────────────────────────────

/** POST /api/admin/masters/states — add a single state */
export const addState = async (state: string): Promise<void> => {
  await axiosInstance.post("/masters/states", { state });
};

/** DELETE /api/admin/masters/states/:state — remove a single state */
export const deleteState = async (state: string): Promise<void> => {
  await axiosInstance.delete(`/masters/states/${encodeURIComponent(state)}`);
};

/** POST /api/admin/masters/states/:state/cities — add a single city */
export const addCity = async (state: string, city: string): Promise<void> => {
  await axiosInstance.post(
    `/masters/states/${encodeURIComponent(state)}/cities`,
    { city }
  );
};

/** PUT /api/admin/masters/states/:state/cities/:city — rename a city */
export const updateCity = async (
  state: string,
  oldCity: string,
  newCity: string
): Promise<void> => {
  await axiosInstance.put(
    `/masters/states/${encodeURIComponent(state)}/cities/${encodeURIComponent(oldCity)}`,
    { city: newCity }
  );
};

/** DELETE /api/admin/masters/states/:state/cities/:city — remove a city */
export const deleteCity = async (state: string, city: string): Promise<void> => {
  await axiosInstance.delete(
    `/masters/states/${encodeURIComponent(state)}/cities/${encodeURIComponent(city)}`
  );
};

// ── Per-value Bank CRUD ───────────────────────────────────────────────────────

/** PUT /api/admin/masters/banks/:value — rename a single bank entry */
export const updateBankValue = async (oldValue: string, newValue: string): Promise<void> => {
  await axiosInstance.put(
    `/masters/banks/${encodeURIComponent(oldValue)}`,
    { value: newValue }
  );
};

/** DELETE /api/admin/masters/banks/:value — remove a single bank entry */
export const deleteBankValue = async (value: string): Promise<void> => {
  await axiosInstance.delete(`/masters/banks/${encodeURIComponent(value)}`);
};
