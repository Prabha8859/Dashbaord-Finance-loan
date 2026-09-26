import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Users } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { getApiErrorMessage, getCustomers, type Customer } from "../../api/customers";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const CustomersList = () => {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setError("");
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load customers."));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.mobile.toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <AdminLayout>
      <div className="flex items-center gap-2 mb-5">
        <Users size={18} style={{ color: "rgb(0, 102, 153)" }} />
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "rgb(0, 102, 153)" }}>
            Customers
          </h2>
          <p className="text-sm text-slate-500">Registered users of the loan portal.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)]"
            />
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border border-slate-300 hover:bg-slate-50 transition"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        ) : customers === null ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-md bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-16 text-center">
            {customers.length === 0 ? "No customers yet." : "No customers match your search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.mobile}</td>
                    <td className="px-4 py-3 text-slate-600">{c.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.isVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {c.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.isActive ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.lastLogin)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CustomersList;
