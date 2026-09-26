import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowUpRight, ChevronLeft, ChevronRight,
  FileText, RefreshCw, Search,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { getLoanTypeLabel, type LoanTypeSlug } from "../../constants/loanTypes";
import {
  getLoansBySlug, SUPPORTED_LOAN_SLUGS,
  getApiErrorMessage, type PersonalLoan,
} from "../../api/personalLoans";

const PAGE_SIZE = 10;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  Pending:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  Approved:  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  Rejected:  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  Submitted: { bg: "bg-sky-50",     text: "text-sky-700",     dot: "bg-sky-500"     },
};

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({
  page, totalPages, total, pageSize, onPrev, onNext, onPage,
}: {
  page: number; totalPages: number; total: number; pageSize: number;
  onPrev: () => void; onNext: () => void; onPage: (p: number) => void;
}) => {
  const pages: number[] = [];
  let s = Math.max(1, page - 2), e = Math.min(totalPages, page + 2);
  if (e - s < 4) { if (s === 1) e = Math.min(totalPages, s + 4); else s = Math.max(1, e - 4); }
  for (let i = s; i <= e; i++) pages.push(i);
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);
  const activeBg = "linear-gradient(135deg,rgb(6,106,156),rgb(38,174,144))";

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{from}–{to}</span> of{" "}
        <span className="font-semibold text-slate-700">{total}</span> applications
      </p>
      <div className="flex items-center gap-1">
        <button onClick={onPrev} disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
          <ChevronLeft size={15} />
        </button>
        {s > 1 && <><button onClick={() => onPage(1)} className="w-8 h-8 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition">1</button>{s > 2 && <span className="text-slate-300 text-xs">…</span>}</>}
        {pages.map(p => (
          <button key={p} onClick={() => onPage(p)}
            className="w-8 h-8 rounded-lg text-xs font-semibold transition"
            style={p === page ? { background: activeBg, color: "#fff", boxShadow: "0 2px 6px rgba(6,106,156,0.3)" } : { color: "#64748b" }}
            onMouseEnter={e => { if (p !== page) e.currentTarget.style.background = "#f1f5f9"; }}
            onMouseLeave={e => { if (p !== page) e.currentTarget.style.background = "transparent"; }}>
            {p}
          </button>
        ))}
        {e < totalPages && <>{e < totalPages - 1 && <span className="text-slate-300 text-xs">…</span>}<button onClick={() => onPage(totalPages)} className="w-8 h-8 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition">{totalPages}</button></>}
        <button onClick={onNext} disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

// ── Main ─────────────────────────────────────────────────────────────────────
const LoanApplicationsList = () => {
  const { loanType } = useParams<{ loanType: LoanTypeSlug }>();
  const navigate    = useNavigate();
  const label       = getLoanTypeLabel(loanType ?? "");
  const isSupported = SUPPORTED_LOAN_SLUGS.has(loanType ?? "");

  const [loans, setLoans]   = useState<PersonalLoan[] | null>(null);
  const [error, setError]   = useState("");
  const [page,  setPage]    = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const load = async () => {
    setError("");
    try {
      if (!isSupported) { setLoans([]); return; }
      const data = await getLoansBySlug(loanType!);
      setLoans(data); setPage(1);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load applications."));
    }
  };

  useEffect(() => { setLoans(null); setPage(1); setSearch(""); setStatusFilter("All"); load(); }, [loanType]); // eslint-disable-line

  // filter
  const filtered = useMemo(() => {
    if (!loans) return [];
    return loans.filter(l => {
      const matchSearch = !search.trim() ||
        (l.fullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (l.mobile ?? "").includes(search) ||
        l._id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [loans, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageLoans  = useMemo(() => {
    const s = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(s, s + PAGE_SIZE);
  }, [filtered, safePage]);

  // status counts
  const counts = useMemo(() => {
    if (!loans) return {};
    return loans.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [loans]);

  return (
    <AdminLayout>
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ background: "linear-gradient(135deg,rgb(6,106,156),rgb(38,174,144))" }}>
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{label} Applications</h2>
            <p className="text-sm text-slate-400">Applications submitted for {label.toLowerCase()}</p>
          </div>
        </div>
        {loans && (
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(STATUS_CFG).map(([s, cfg]) => (
              <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {s}: {counts[s] ?? 0}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* ── Filters bar ── */}
        {loans && loans.length > 0 && (
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, mobile, ID…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(6,106,156,0.25)] focus:border-[rgb(6,106,156)] transition"
              />
            </div>
            {/* Status filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "Submitted", "Pending", "Approved", "Rejected"].map(s => {
                const active = statusFilter === s;
                const cfg = STATUS_CFG[s];
                return (
                  <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? s === "All"
                          ? "text-white shadow-sm"
                          : `${cfg.bg} ${cfg.text} ring-1 ring-current`
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                    style={active && s === "All"
                      ? { background: "linear-gradient(135deg,rgb(6,106,156),rgb(38,174,144))" }
                      : undefined}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── States ── */}
        {error ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <RefreshCw size={20} className="text-red-400" />
            </div>
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button onClick={load} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition">
              <RefreshCw size={14} /> Retry
            </button>
          </div>

        ) : loans === null ? (
          <div className="p-5 space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" style={{ opacity: 1 - i * 0.08 }} />
            ))}
          </div>

        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText size={24} className="text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-500">
              {loans.length === 0
                ? isSupported ? "No applications yet" : `API endpoint for ${label} not available`
                : "No results found"}
            </p>
            {loans.length > 0 && (
              <p className="text-sm text-slate-400">Try adjusting your search or filter</p>
            )}
          </div>

        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-100"
                    style={{ background: "linear-gradient(90deg,#f8fafc,#f1f5f9)" }}>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider w-10">#</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Application ID</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Applicant</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Tenure</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Applied On</th>
                    <th className="px-5 py-3.5 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {pageLoans.map((loan, i) => {
                    const cfg = STATUS_CFG[loan.status];
                    const rowNum = (safePage - 1) * PAGE_SIZE + i + 1;
                    return (
                      <tr key={loan._id}
                        onClick={() => navigate(`/applications/${loanType}/${loan._id}`)}
                        className="border-b border-slate-50 cursor-pointer transition-all hover:bg-gradient-to-r hover:from-[rgba(6,106,156,0.03)] hover:to-[rgba(38,174,144,0.03)] group">
                        <td className="px-5 py-4 text-xs text-slate-300 font-mono tabular-nums">{rowNum}</td>
                        <td className="px-5 py-4">
                          <span className="inline-block font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium group-hover:bg-[rgba(6,106,156,0.08)] group-hover:text-[rgb(6,106,156)] transition-colors">
                            #{loan._id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ background: "linear-gradient(135deg,#066a9c,#26ae90)" }}>
                              {(loan.fullName ?? "?")[0]?.toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800">{loan.fullName ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-mono text-xs">{loan.mobile ?? "—"}</td>
                        <td className="px-5 py-4 font-bold text-slate-800">{formatCurrency(loan.loanAmount)}</td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {loan.loanTenure} mo
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg?.bg ?? "bg-slate-100"} ${cfg?.text ?? "text-slate-600"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot ?? "bg-slate-400"}`} />
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400 text-xs">{formatDate(loan.createdAt)}</td>
                        <td className="px-5 py-4">
                          <ArrowUpRight size={14} className="text-slate-300 group-hover:text-[rgb(6,106,156)] transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <Pagination
                page={safePage} totalPages={totalPages}
                total={filtered.length} pageSize={PAGE_SIZE}
                onPrev={() => setPage(p => Math.max(1, p - 1))}
                onNext={() => setPage(p => Math.min(totalPages, p + 1))}
                onPage={setPage}
              />
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default LoanApplicationsList;
