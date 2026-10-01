export type LoanTypeSlug =
  | "personal-loan"
  | "business-loan"
  | "home-loan"
  | "loan-against-property"
  | "balance-transfer"
  | "project-loan"
  | "car-loan"
  | "education-loan"
  | "credit-card"
  | "working-capital"
  | "commercial-purchase"
  | "lease-rental-discounting"
  | "odcc-limit"
  | "loan-against-share"
  | "npa-loan"
  | "gold-loan"
  | "fdi-loan";

export interface LoanTypeDef {
  slug: LoanTypeSlug;
  label: string;
}

export const LOAN_TYPES: LoanTypeDef[] = [
  { slug: "personal-loan", label: "Personal Loan" },
  { slug: "business-loan", label: "Business Loan" },
  { slug: "home-loan", label: "Home Loan" },
  { slug: "loan-against-property", label: "Loan Against Property" },
  { slug: "balance-transfer", label: "Balance Transfer" },
  { slug: "project-loan", label: "Project Loan" },
  { slug: "car-loan", label: "Car Loan" },
  { slug: "education-loan", label: "Education Loan" },
  { slug: "credit-card", label: "Credit Card" },
  { slug: "working-capital", label: "Working Capital" },
  { slug: "commercial-purchase", label: "Commercial Purchase" },
  { slug: "lease-rental-discounting", label: "Lease Rental Discounting" },
  { slug: "odcc-limit", label: "OD/CC Limit" },
  { slug: "loan-against-share", label: "Loan Against Share" },
  { slug: "npa-loan", label: "NPA Loan" },
  { slug: "gold-loan", label: "Gold Loan" },
  { slug: "fdi-loan", label: "FDI Loan" },
];

export const getLoanTypeLabel = (slug: string): string =>
  LOAN_TYPES.find((l) => l.slug === slug)?.label ?? slug;
