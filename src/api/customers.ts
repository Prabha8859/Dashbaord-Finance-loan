import axiosInstance from "./axiosInstance";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Customer {
  _id: string;
  name: string;
  mobile: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  role: string;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export { getApiErrorMessage } from "../utils/apiError";

// ── API Calls ────────────────────────────────────────────────────────────────

export const getCustomers = async (search?: string): Promise<Customer[]> => {
  const res = await axiosInstance.get<{ success?: boolean; customers?: Customer[]; data?: Customer[] }>(
    "/customers",
    { params: search ? { search } : undefined }
  );
  if (Array.isArray(res.data)) return res.data as Customer[];
  return res.data?.customers ?? res.data?.data ?? [];
};

export const getCustomer = async (id: string): Promise<Customer> => {
  const res = await axiosInstance.get<{ success?: boolean; customer?: Customer; data?: Customer }>(
    `/customers/${id}`
  );
  const item = res.data?.customer ?? res.data?.data ?? res.data;
  return item as Customer;
};

/** DELETE /api/admin/customers/:id — remove a customer account */
export const deleteCustomer = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/customers/${id}`);
};
