import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, ListTree, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import NewMasterModal from "../../components/masters/NewMasterModal";
import { useToast } from "../../context/ToastContext";
import {
  deleteMaster,
  getApiErrorMessage,
  getMasters,
  type MasterSummary,
} from "../../api/masters";
import { isLocationMasterType } from "../../constants/masterTypes";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const MastersList = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [masters,      setMasters]      = useState<MasterSummary[] | null>(null);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MasterSummary | null>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = async () => {
    setError("");
    try {
      const list = await getMasters();
      // only show bank-type masters here — location masters live on their own page
      setMasters(list.filter(m => !isLocationMasterType(m.type)));
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load masters."));
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!masters) return [];
    const q = search.trim().toLowerCase();
    if (!q) return masters;
    return masters.filter(
      m => m.label.toLowerCase().includes(q) || m.type.toLowerCase().includes(q)
    );
  }, [masters, search]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteMaster(pendingDelete._id);
      setMasters(prev => prev ? prev.filter(m => m._id !== pendingDelete._id) : prev);
      showToast(`"${pendingDelete.label}" deleted`, "success");
      setPendingDelete(null);
    } catch (err) {
      showToast(getApiErrorMessage(err, "Unable to delete this master."), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "rgb(0, 102, 153)" }}>
            Bank Details
          </h2>
          <p className="text-sm text-slate-500">
            Manage bank dropdown lists used in loan application forms.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold text-white shrink-0 hover:brightness-110 transition"
          style={{ background: "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))" }}
        >
          <Plus size={16} />
          New Master
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search masters..."
              className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)]"
            />
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={load}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border border-slate-300 hover:bg-slate-50 transition">
              <RefreshCw size={14} /> Retry
            </button>
          </div>

        ) : masters === null ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-md bg-slate-100 animate-pulse" />
            ))}
          </div>

        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-16 text-center">
            {masters.length === 0
              ? "No bank masters yet. Create the first one."
              : "No masters match your search."}
          </p>

        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Type Key</th>
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3">Values</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(m => (
                  <tr key={m._id}
                    className="hover:bg-slate-50 cursor-pointer transition"
                    onClick={() => navigate(`/masters/type/${encodeURIComponent(m.type)}`)}>
                    <td className="px-4 py-3 font-medium text-slate-800">{m.label}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {m.type}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.kind === "grouped"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-sky-50 text-sky-700"
                      }`}>
                        {m.kind === "grouped"
                          ? <><ListTree size={12} /> Grouped</>
                          : <><Database size={12} /> List</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.count} {m.kind === "grouped" ? "groups" : "items"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(m.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={e => { e.stopPropagation(); setPendingDelete(m); }}
                          aria-label={`Delete ${m.label}`}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewModal && (
        <NewMasterModal
          onClose={() => setShowNewModal(false)}
          onCreated={master => {
            setShowNewModal(false);
            showToast(`"${master.label}" created`, "success");
            navigate(`/masters/type/${encodeURIComponent(master.type)}`);
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete "${pendingDelete.label}"?`}
          message="This list may still be used by the public loan application forms. Deleting it can break dropdowns that rely on it. This cannot be undone."
          confirmText={pendingDelete.type}
          confirmLabel="Delete Master"
          isSubmitting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </AdminLayout>
  );
};

export default MastersList;
