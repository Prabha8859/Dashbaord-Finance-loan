import { getCustomers, type Customer } from "./customers";
import {
  getLoansBySlug,
  SUPPORTED_LOAN_SLUGS,
  type PersonalLoan,
} from "./personalLoans";
import { LOAN_TYPES } from "../constants/loanTypes";
import { getApiErrorMessage } from "../utils/apiError";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductStat {
  slug: string;
  label: string;
  /** false when the frontend has no endpoint mapped for this product yet */
  supported: boolean;
  total: number;
  submitted: number;
  pending: number;
  approved: number;
  rejected: number;
  other: number;
  requestedAmount: number;
  approvedAmount: number;
  /** set when the endpoint exists but the request failed */
  error?: string;
}

export interface RecentApplication extends PersonalLoan {
  slug: string;
  label: string;
}

export interface DashboardStats {
  totalCustomers: number;
  customersError?: string;

  totalApplications: number;
  submitted: number;
  pending: number;
  approved: number;
  rejected: number;

  /** Sum of loanAmount across every application */
  requestedAmount: number;
  /** Sum of loanAmount across approved applications only */
  approvedAmount: number;
  /** approved / total, as a 0–100 percentage */
  approvalRate: number;

  products: ProductStat[];
  /** Product labels whose endpoint is not wired up yet */
  unavailableProducts: string[];
  /** Product labels whose endpoint failed on this request */
  failedProducts: string[];

  recent: RecentApplication[];
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Bucket = "submitted" | "pending" | "approved" | "rejected" | "other";

const bucketOf = (status?: string): Bucket => {
  switch ((status ?? "").trim().toLowerCase()) {
    case "approved":
      return "approved";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    case "submitted":
      return "submitted";
    default:
      return "other";
  }
};

const amountOf = (loan: PersonalLoan): number =>
  typeof loan.loanAmount === "number" && Number.isFinite(loan.loanAmount)
    ? loan.loanAmount
    : 0;

const MAX_RECENT = 8;

// ── Main loader ───────────────────────────────────────────────────────────────

/**
 * Aggregates dashboard numbers on the client by fanning out to every loan
 * product endpoint plus the customers endpoint.
 *
 * One failed product never blocks the rest of the dashboard — each request is
 * settled independently and reported through `failedProducts`.
 *
 * Recommended backend replacement: `GET /dashboard/stats` (see
 * docs/BACKEND_API.md). This client-side aggregation keeps the dashboard
 * working until that endpoint exists.
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const [customerResult, productResults] = await Promise.all([
    getCustomers()
      .then((customers: Customer[]) => ({ ok: true as const, customers }))
      .catch((err: unknown) => ({
        ok: false as const,
        customers: [] as Customer[],
        error: getApiErrorMessage(err, "Unable to load customers."),
      })),

    Promise.all(
      LOAN_TYPES.map(async (type) => {
        if (!SUPPORTED_LOAN_SLUGS.has(type.slug)) {
          return {
            slug: type.slug,
            label: type.label,
            supported: false as const,
            loans: [] as PersonalLoan[],
            error: undefined,
          };
        }
        try {
          const loans = await getLoansBySlug(type.slug);
          return {
            slug: type.slug,
            label: type.label,
            supported: true as const,
            loans,
            error: undefined,
          };
        } catch (err) {
          return {
            slug: type.slug,
            label: type.label,
            supported: true as const,
            loans: [] as PersonalLoan[],
            error: getApiErrorMessage(err, "Request failed."),
          };
        }
      })
    ),
  ]);

  let totalApplications = 0;
  let submitted = 0;
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let requestedAmount = 0;
  let approvedAmount = 0;

  const recent: RecentApplication[] = [];
  const unavailableProducts: string[] = [];
  const failedProducts: string[] = [];

  const products: ProductStat[] = productResults.map((result) => {
    const stat: ProductStat = {
      slug: result.slug,
      label: result.label,
      supported: result.supported,
      total: result.loans.length,
      submitted: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      other: 0,
      requestedAmount: 0,
      approvedAmount: 0,
      error: result.error,
    };

    for (const loan of result.loans) {
      const bucket = bucketOf(loan.status);
      stat[bucket] += 1;
      const amount = amountOf(loan);
      stat.requestedAmount += amount;
      if (bucket === "approved") stat.approvedAmount += amount;
      recent.push({ ...loan, slug: result.slug, label: result.label });
    }

    totalApplications += stat.total;
    submitted += stat.submitted;
    pending += stat.pending;
    approved += stat.approved;
    rejected += stat.rejected;
    requestedAmount += stat.requestedAmount;
    approvedAmount += stat.approvedAmount;

    if (!result.supported) unavailableProducts.push(result.label);
    else if (result.error) failedProducts.push(result.label);

    return stat;
  });

  recent.sort((a, b) => {
    const at = a.createdAt ?? "";
    const bt = b.createdAt ?? "";
    if (at !== bt) return at < bt ? 1 : -1; // newest first
    return 0; // stable order for equal timestamps
  });

  return {
    totalCustomers: customerResult.customers.length,
    customersError: customerResult.ok ? undefined : customerResult.error,

    totalApplications,
    submitted,
    pending,
    approved,
    rejected,

    requestedAmount,
    approvedAmount,
    approvalRate:
      totalApplications > 0 ? (approved / totalApplications) * 100 : 0,

    products,
    unavailableProducts,
    failedProducts,

    recent: recent.slice(0, MAX_RECENT),
    generatedAt: new Date().toISOString(),
  };
};
