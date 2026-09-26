import { LOAN_TYPES, type LoanTypeSlug } from "../constants/loanTypes";

export type ApplicationStatus = "Pending" | "Approved" | "Rejected";

export interface LoanApplication {
  id: string;
  applicantName: string;
  phone: string;
  amount: number;
  status: ApplicationStatus;
  appliedOn: string;
}

const NAMES: [string, string][] = [
  ["Rahul Sharma", "9876543210"],
  ["Priya Verma", "9123456780"],
];

const STATUSES: ApplicationStatus[] = ["Pending", "Approved"];

const AMOUNTS = [250000, 750000];

const buildApplications = (slug: LoanTypeSlug): LoanApplication[] =>
  NAMES.map(([name, phone], i) => ({
    id: `${slug.toUpperCase()}-100${i + 1}`,
    applicantName: name,
    phone,
    amount: AMOUNTS[i],
    status: STATUSES[i],
    appliedOn: i === 0 ? "2026-08-20" : "2026-08-24",
  }));

export const DUMMY_APPLICATIONS: Record<LoanTypeSlug, LoanApplication[]> =
  LOAN_TYPES.reduce((acc, { slug }) => {
    acc[slug] = buildApplications(slug);
    return acc;
  }, {} as Record<LoanTypeSlug, LoanApplication[]>);
