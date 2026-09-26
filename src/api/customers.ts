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
  const res = await axiosInstance.get<{ success: boolean; customers: Customer[] }>(
    "/customers",
    { params: search ? { search } : undefined }
  );
  return res.data.customers;
};

export const getCustomer = async (id: string): Promise<Customer> => {
  const res = await axiosInstance.get<{ success: boolean; customer: Customer }>(
    `/customers/${id}`
  );
  return res.data.customer;
};
