import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Briefcase, Building2, Calendar,
  CreditCard, Hash, Mail, MapPin, Phone,
  RefreshCw, TrendingDown, User,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { getLoanTypeLabel } from "../../constants/loanTypes";
import { getLoanBySlug, getApiErrorMessage, type PersonalLoan } from "../../api/personalLoans";

// ── Helpers ───────────────────────────────────────────────────────────────────
const INR = (v?: number) =>
  v != null ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v) : "—";

const DT = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const V = (v?: string | number | null) =>
  v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : "—";

const initials = (n?: string) =>
  n ? n.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") : "?";

// ── Status ────────────────────────────────────────────────────────────────────
const S_CFG: Record<string, { pill: string; dot: string; glow: string }> = {
  Submitted: { pill: "bg-sky-100 text-sky-700 ring-sky-200",       dot: "bg-sky-500",     glow: "#0ea5e9" },
  Pending:   { pill: "bg-amber-100 text-amber-700 ring-amber-200", dot: "bg-amber-400",   glow: "#f59e0b" },
  Approved:  { pill: "bg-emerald-100 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500", glow: "#10b981" },
  Rejected:  { pill: "bg-red-100 text-red-600 ring-red-200",       dot: "bg-red-500",     glow: "#ef4444" },
};

// ── Building blocks ───────────────────────────────────────────────────────────

/** Coloured metric tile */
const Tile = ({ label, value, icon: I, color }: { label: string; value: string; icon: React.ComponentType<{ size?: number }>; color: string }) => (
  <div className="relative flex items-center gap-3.5 rounded-2xl p-4 overflow-hidden border border-white/60"
    style={{ background: `linear-gradient(135deg,${color}12,${color}06)` }}>
    <div className="absolute inset-0 rounded-2xl" style={{ border: `1.5px solid ${color}22` }} />
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
      style={{ background: color, color: "#fff" }}>
      <I size={17} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${color}99` }}>{label}</p>
      <p className="text-sm font-extrabold text-slate-800 truncate mt-0.5">{value}</p>
    </div>
  </div>
);

/** Section card */
const Card = ({ title, icon: I, color, children }: {
  title: string; icon: React.ComponentType<{ size?: number }>; color: string; children: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: `${color}15`, color }}>
        <I size={14} />
      </div>
      <span className="text-sm font-bold text-slate-700">{title}</span>
    </div>
    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
      {children}
    </div>
  </div>
);

/** Field */
const F = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    {value === "—"
      ? <p className="text-sm text-slate-300 font-medium">—</p>
      : <p className={`text-sm font-semibold text-slate-800 break-words leading-snug ${mono ? "font-mono" : ""}`}>{value}</p>}
  </div>
);

/** Divider row of metadata */
const MetaRow = ({ items }: { items: { label: string; value: string }[] }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
    <div className="grid divide-x divide-slate-100" style={{ gridTemplateColumns: `repeat(${items.length},1fr)` }}>
      {items.map(({ label, value }) => (
        <div key={label} className="px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
          <p className="text-xs font-mono font-semibold text-slate-700 truncate">{value}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const PersonalLoanDetail = () => {
  const { loanType, id } = useParams<{ loanType: string; id: string }>();
  const navigate = useNavigate();
  const label    = getLoanTypeLabel(loanType ?? "");

  const [loan,  setLoan]  = useState<PersonalLoan | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    if (!id || !loanType) return;
    setError("");
    try { setLoan(await getLoanBySlug(loanType, id)); }
    catch (err) { setError(getApiErrorMessage(err, "Unable to load application details.")); }
  };
  useEffect(() => { load(); }, [id, loanType]); // eslint-disable-line

  const isBiz  = loanType === "business-loan";
  const sCfg   = loan ? (S_CFG[loan.status] ?? S_CFG.Submitted) : null;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!loan && !error) return (
    <AdminLayout>
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-slate-100" />
        <div className="h-52 rounded-2xl bg-slate-100" />
        <div className="h-40 rounded-2xl bg-slate-100" />
        <div className="h-40 rounded-2xl bg-slate-100" />
      </div>
    </AdminLayout>
  );

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (error) return (
    <AdminLayout>
      <div className="flex flex-col items-center gap-4 py-28 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center shadow-sm">
          <RefreshCw size={24} className="text-red-400" />
        </div>
        <p className="text-base font-semibold text-slate-700">Failed to load</p>
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={load}
          className="mt-1 flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition">
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>

      {/* ── Topbar ── */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition shrink-0">
          <ArrowLeft size={15} className="text-slate-500" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Application Detail</p>
          <h1 className="text-xl font-extrabold text-slate-800 leading-tight">{label}</h1>
        </div>
        {sCfg && (
          <span className={`flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-sm font-bold ring-1 ${sCfg.pill}`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${sCfg.dot}`} />
            {loan!.status}
          </span>
        )}
      </div>

      {/* ── Hero card ── */}
      <div className="rounded-3xl overflow-hidden shadow-lg border border-white/20 mb-5">
        {/* Banner */}
        <div className="relative px-8 py-8 flex items-center gap-6 overflow-hidden"
          style={{ background: "linear-gradient(135deg,#03405e 0%,#066a9c 55%,#0d9488 100%)" }}>
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-6 right-36 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-10 left-1/3 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />

          {/* Avatar */}
          <div className="relative z-10 w-18 h-18 shrink-0">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white border-2 border-white/30 shadow-xl"
              style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}>
              {initials(loan!.fullName)}
            </div>
            {sCfg && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow"
                style={{ background: sCfg.glow }} />
            )}
          </div>

          {/* Info */}
          <div className="relative z-10 flex-1 min-w-0">
            <h2 className="text-white text-2xl font-extrabold leading-tight truncate">
              {loan!.fullName ?? "—"}
            </h2>
            <div className="flex flex-wrap gap-4 mt-2.5">
              {loan!.mobile && (
                <span className="flex items-center gap-1.5 text-white/70 text-sm">
                  <Phone size={12} className="shrink-0" />{loan!.mobile}
                </span>
              )}
              {loan!.email && (
                <span className="flex items-center gap-1.5 text-white/70 text-sm truncate">
                  <Mail size={12} className="shrink-0" />{loan!.email}
                </span>
              )}
              {loan!.panNumber && (
                <span className="flex items-center gap-1.5 text-white/60 text-sm font-mono">
                  <Hash size={12} className="shrink-0" />{loan!.panNumber}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {loan!.state && (
                <span className="flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-medium px-2.5 py-1 rounded-full">
                  <MapPin size={10} />{loan!.city ? `${loan!.city}, ` : ""}{loan!.state}
                </span>
              )}
              {loan!.residenceStatus && (
                <span className="bg-white/10 text-white/80 text-xs font-medium px-2.5 py-1 rounded-full">
                  {loan!.residenceStatus}
                </span>
              )}
            </div>
          </div>

          {/* Applied date */}
          <div className="relative z-10 hidden lg:flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1.5 text-white/50 text-xs font-semibold uppercase tracking-widest">
              <Calendar size={11} /> Applied
            </div>
            <p className="text-white font-bold text-sm">{DT(loan!.createdAt)}</p>
          </div>
        </div>

        {/* Metric tiles */}
        <div className="bg-white border-t border-slate-100 px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Tile label="Loan Amount" value={INR(loan!.loanAmount)}              icon={CreditCard} color="#066a9c" />
          <Tile label="Tenure"      value={loan!.loanTenure ? `${loan!.loanTenure} months` : "—"} icon={Calendar} color="#0d9488" />
          <Tile label="Loan Type"   value={V(loan!.loanType)}                  icon={Briefcase}  color="#7c3aed" />
          <Tile label="App. ID"     value={`#${loan!._id.slice(-8).toUpperCase()}`} icon={Hash}   color="#d97706" />
        </div>
      </div>

      {/* ── Detail sections ── */}
      <div className="space-y-4">

        {/* Applicant */}
        <Card title="Applicant Information" icon={User} color="#066a9c">
          <F label="Full Name"        value={V(loan!.fullName)} />
          <F label="Mobile"           value={V(loan!.mobile)} mono />
          <F label="Email"            value={V(loan!.email)} />
          <F label="Date of Birth"    value={DT(loan!.dob)} />
          <F label="PAN Number"       value={V(loan!.panNumber)} mono />
          <F label="Residence Status" value={V(loan!.residenceStatus)} />
          <F label="State"            value={V(loan!.state)} />
          <F label="City"             value={V(loan!.city)} />
          <F label="Pincode"          value={V(loan!.pincode)} mono />
        </Card>

        {isBiz ? (
          <>
            <Card title="Business Information" icon={Building2} color="#0d9488">
              <F label="Business Name"    value={V(loan!.businessName)} />
              <F label="Business Type"    value={V(loan!.businessType)} />
              <F label="Business Vintage" value={V(loan!.businessVintage)} />
              <F label="GST Number"       value={V(loan!.gstNumber)} mono />
              <F label="Udyam Number"     value={V(loan!.udyamNumber)} mono />
              <F label="Company Name"     value={V(loan!.companyName)} />
              <F label="Company Type"
                value={loan!.companyType === "Other" ? `Other — ${V(loan!.companyTypeOther)}` : V(loan!.companyType)} />
            </Card>

            <Card title="Financial Details" icon={TrendingDown} color="#d97706">
              <F label="Current Year Turnover"    value={INR(loan!.currentYearTurnover)} />
              <F label="Prior Year Turnover"      value={INR(loan!.priorYearTurnover)} />
              <F label="Last Year Turnover"       value={INR(loan!.lastYearTurnover)} />
              <F label="Current Year Net Income"  value={INR(loan!.currentYearNetIncome)} />
              <F label="Previous Year Net Income" value={INR(loan!.previousYearNetIncome)} />
            </Card>
          </>
        ) : (
          <Card title="Employment & Salary" icon={Briefcase} color="#0d9488">
            <F label="Employment Type" value={V(loan!.employmentType)} />
            <F label="Company Name"    value={V(loan!.companyName)} />
            <F label="Company Type"
              value={loan!.companyType === "Other" ? `Other — ${V(loan!.companyTypeOther)}` : V(loan!.companyType)} />
            <F label="Monthly Salary"     value={INR(loan!.monthlySalary)} />
            <F label="Salary Received As"
              value={loan!.salaryReceivedAs === "Other" ? `Other — ${V(loan!.salaryReceivedAsOther)}` : V(loan!.salaryReceivedAs)} />
            <F label="Salary Bank"
              value={loan!.salaryBankName === "Other" ? `Other — ${V(loan!.salaryBankOther)}` : V(loan!.salaryBankName)} />
          </Card>
        )}

        {/* Liabilities */}
        <Card title="Existing Liabilities" icon={TrendingDown} color="#dc2626">
          <F label="Existing Monthly EMI"  value={INR(loan!.existingEMI)} />
          <F label="Existing Loan Amount"  value={INR(loan!.existingLoanAmount)} />
          <F label="Existing Banks"
            value={(loan!.existingBanks?.length || loan!.otherBankList?.length)
              ? [...(loan!.existingBanks ?? []), ...(loan!.otherBankList ?? [])].join(", ")
              : "None"} />
          <F label="Existing Loan Types"
            value={(loan!.existingLoanTypes?.length || loan!.otherLoanList?.length)
              ? [...(loan!.existingLoanTypes ?? []), ...(loan!.otherLoanList ?? [])].join(", ")
              : "None"} />
        </Card>

        {/* Footer meta */}
        <MetaRow items={[
          { label: "Application ID", value: loan!._id },
          { label: "Applied On",     value: DT(loan!.createdAt) },
          { label: "Last Updated",   value: DT(loan!.updatedAt) },
          { label: "Status",         value: loan!.status },
        ]} />

      </div>
    </AdminLayout>
  );
};

export default PersonalLoanDetail;
