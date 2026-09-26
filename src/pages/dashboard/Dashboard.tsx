import { CheckCircle2, Clock, FileText, Handshake, Users, XCircle } from "lucide-react";
import type { ComponentType } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { getLoanTypeLabel } from "../../constants/loanTypes";
import { DUMMY_APPLICATIONS, type ApplicationStatus } from "../../data/dummyApplications";

const allApplications = Object.entries(DUMMY_APPLICATIONS).flatMap(([slug, apps]) =>
  apps.map((app) => ({ ...app, loanType: slug }))
);

const STATUS_COUNTS = allApplications.reduce<Record<ApplicationStatus, number>>(
  (acc, app) => {
    acc[app.status] += 1;
    return acc;
  },
  { Pending: 0, Approved: 0, Rejected: 0 }
);

const TOTAL_APPLICATIONS = allApplications.length;
const TOTAL_CUSTOMERS = 128;

const recentApplications = [...allApplications]
  .sort((a, b) => (a.appliedOn < b.appliedOn ? 1 : -1))
  .slice(0, 6);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    amount
  );

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
};

interface StatCardProps {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number }>;
  iconBg: string;
  iconColor: string;
}

const StatCard = ({ label, value, icon: Icon, iconBg, iconColor }: StatCardProps) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
    <div
      className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: iconBg, color: iconColor }}
    >
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 truncate">{label}</p>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
    </div>
  </div>
);

const STATUS_BAR_COLORS: Record<ApplicationStatus, string> = {
  Approved: "#10b981",
  Pending: "#f59e0b",
  Rejected: "#ef4444",
};

const Dashboard = () => {
  const { admin } = useAuth();

  const statusOrder: ApplicationStatus[] = ["Approved", "Pending", "Rejected"];

  return (
    <AdminLayout>
      <div className="mb-5">
        <h2 className="text-lg font-semibold" style={{ color: "rgb(0, 102, 153)" }}>
          Welcome, {admin?.name}
        </h2>
        <p className="text-sm text-slate-500">Here&apos;s what&apos;s happening across the loan portal.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Customers"
          value={TOTAL_CUSTOMERS.toLocaleString("en-IN")}
          icon={Users}
          iconBg="rgba(0,102,153,0.08)"
          iconColor="rgb(0,102,153)"
        />
        <StatCard
          label="Total Applications"
          value={TOTAL_APPLICATIONS.toLocaleString("en-IN")}
          icon={FileText}
          iconBg="rgba(38,174,144,0.1)"
          iconColor="rgb(20,140,115)"
        />
        <StatCard
          label="Pending Review"
          value={STATUS_COUNTS.Pending.toLocaleString("en-IN")}
          icon={Clock}
          iconBg="#fffbeb"
          iconColor="#b45309"
        />
        <StatCard
          label="Approved"
          value={STATUS_COUNTS.Approved.toLocaleString("en-IN")}
          icon={CheckCircle2}
          iconBg="#ecfdf5"
          iconColor="#047857"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Application status distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Application Status</h3>
          <p className="text-xs text-slate-500 mb-4">Across all {TOTAL_APPLICATIONS} applications</p>

          <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px] bg-slate-100 mb-4">
            {statusOrder.map((status) => {
              const count = STATUS_COUNTS[status];
              if (count === 0) return null;
              return (
                <div
                  key={status}
                  style={{
                    width: `${(count / TOTAL_APPLICATIONS) * 100}%`,
                    background: STATUS_BAR_COLORS[status],
                  }}
                />
              );
            })}
          </div>

          <div className="space-y-2.5">
            {statusOrder.map((status) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: STATUS_BAR_COLORS[status] }}
                  />
                  <span className="text-slate-600">{status}</span>
                </div>
                <span className="font-medium text-slate-800">{STATUS_COUNTS[status]}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            <XCircle size={14} />
            Sample data — live counts arrive once applications are wired to the backend.
          </div>
        </div>

        {/* Recent applications */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden lg:col-span-2">
          <div className="p-5 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Recent Applications</h3>
              <p className="text-xs text-slate-500">Latest submissions across all loan types</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-5 py-2.5">Applicant</th>
                  <th className="px-5 py-2.5">Loan Type</th>
                  <th className="px-5 py-2.5">Amount</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Applied On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-medium text-slate-800">{app.applicantName}</td>
                    <td className="px-5 py-3 text-slate-600">{getLoanTypeLabel(app.loanType)}</td>
                    <td className="px-5 py-3 text-slate-700">{formatCurrency(app.amount)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[app.status]}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(app.appliedOn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Coming soon */}
      <div className="mt-4 border border-dashed border-slate-300 rounded-xl p-4 flex items-center gap-3 text-slate-400 bg-slate-50/60">
        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <Handshake size={18} />
        </div>
        <p className="text-sm">
          <span className="font-medium text-slate-500">Franchisee management</span> — coming soon.
        </p>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
