import axiosInstance from "./axiosInstance";

export { getApiErrorMessage } from "../utils/apiError";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LoanStatus = "Pending" | "Approved" | "Rejected" | "Submitted";

export interface PersonalLoan {
  _id: string;
  user: string;
  loanType: string;
  loanAmount: number;
  loanTenure: number;

  // common fields
  fullName?: string;
  mobile?: string;
  email?: string;
  dob?: string;
  panNumber?: string;
  state?: string;
  city?: string;
  pincode?: string;
  residenceStatus?: string;
  employmentType?: string;
  companyName?: string;
  companyType?: string;
  companyTypeOther?: string;
  monthlySalary?: number;
  salaryReceivedAs?: string;
  salaryReceivedAsOther?: string;
  salaryBankName?: string;
  salaryBankOther?: string;
  existingEMI?: number;
  existingLoanAmount?: number;
  existingBanks?: string[];
  otherBankList?: string[];
  existingLoanTypes?: string[];
  otherLoanList?: string[];

  // business loan fields
  businessName?: string;
  businessType?: string;
  businessVintage?: string;
  currentYearTurnover?: number;
  priorYearTurnover?: number;
  lastYearTurnover?: number;
  currentYearNetIncome?: number;
  previousYearNetIncome?: number;
  gstNumber?: string;
  udyamNumber?: string;

  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Extract the array from any of the common backend response shapes */
const extractList = (data: Record<string, unknown>): PersonalLoan[] => {
  const list = (data.data ?? data.loans ?? data.applications) as PersonalLoan[] | undefined;
  if (!Array.isArray(list)) {
    throw new Error(`Unexpected response shape. Keys: ${Object.keys(data).join(", ")}`);
  }
  return list;
};

/** Extract a single item from any of the common backend response shapes */
const extractItem = (data: Record<string, unknown>, path: string): PersonalLoan => {
  const item = (data.data ?? data.loan ?? data.application) as PersonalLoan | undefined;
  if (!item) {
    throw new Error(`Unexpected response shape at ${path}. Keys: ${Object.keys(data).join(", ")}`);
  }
  return item;
};

// ── Slug → endpoint map ───────────────────────────────────────────────────────
// Add new loan types here when their backend routes go live.

const SLUG_ENDPOINT: Record<string, string> = {
  "personal-loan":          "/personal-loans",
  "business-loan":          "/business-loans",
  "home-loan":              "/home-loans",
  "loan-against-property":  "/loan-against-properties",
};

/** All slugs that have a live backend endpoint */
export const SUPPORTED_LOAN_SLUGS = new Set(Object.keys(SLUG_ENDPOINT));

// ── API calls ─────────────────────────────────────────────────────────────────

/** Fetch all applications for a given loan type slug */
export const getLoansBySlug = async (slug: string): Promise<PersonalLoan[]> => {
  const endpoint = SLUG_ENDPOINT[slug];
  if (!endpoint) throw new Error(`No endpoint mapped for slug: ${slug}`);

  const res = await axiosInstance.get<Record<string, unknown>>(endpoint);
  if (import.meta.env.DEV) console.log(`[loans] GET ${endpoint}:`, res.data);
  return extractList(res.data);
};

/** Fetch a single application by ID for a given loan type slug */
export const getLoanBySlug = async (slug: string, id: string): Promise<PersonalLoan> => {
  const endpoint = SLUG_ENDPOINT[slug];
  if (!endpoint) throw new Error(`No endpoint mapped for slug: ${slug}`);

  const path = `${endpoint}/${id}`;
  const res = await axiosInstance.get<Record<string, unknown>>(path);
  if (import.meta.env.DEV) console.log(`[loans] GET ${path}:`, res.data);
  return extractItem(res.data, path);
};

// ── Keep named exports for any direct usage ───────────────────────────────────

export const getPersonalLoans  = () => getLoansBySlug("personal-loan");
export const getBusinessLoans  = () => getLoansBySlug("business-loan");
export const getHomeLoans      = () => getLoansBySlug("home-loan");

export const getPersonalLoan  = (id: string) => getLoanBySlug("personal-loan", id);
export const getBusinessLoan  = (id: string) => getLoanBySlug("business-loan", id);
export const getHomeLoan      = (id: string) => getLoanBySlug("home-loan", id);
