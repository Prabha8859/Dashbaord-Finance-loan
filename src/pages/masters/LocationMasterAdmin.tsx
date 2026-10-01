import { useEffect, useState } from "react";
import {
  Globe, MapPin, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2, X,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  createLocationRecord,
  deleteLocationRecord,
  getPincodeTable,
  getLocationCounts,
  getLocationRecords,
  updateLocationRecord,
  type LocationCounts,
  type LocationRecord,
  type LocationResource,
  type LocationStatus,
  type PincodeTablePage,
  type PincodeTableRow,
} from "../../api/locationMasters";

const ACTIVE_BG = "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))";
const STATUS_OPTIONS: LocationStatus[] = ["active", "inactive", "coming_soon"];
const EMPTY_COUNTS: LocationCounts = {
  totalContinents: 0,
  totalCountries: 0,
  totalStates: 0,
  totalCities: 0,
  totalPincodes: 0,
};

type DeleteMode = "soft" | "force";

interface LevelPaneProps {
  title: string;
  resource: LocationResource;
  records: LocationRecord[];
  selectedId?: string | null;
  disabled?: boolean;
  disabledMessage?: string;
  loading: boolean;
  onSelect?: (record: LocationRecord) => void;
  onAdd: (name: string) => Promise<void>;
  onRename: (record: LocationRecord, name: string) => Promise<void>;
  onStatus: (record: LocationRecord, status: LocationStatus) => Promise<void>;
  onDelete: (record: LocationRecord) => Promise<void>;
}

const LocationLevelPane = ({
  title, resource, records, selectedId, disabled = false, disabledMessage,
  loading, onSelect, onAdd, onRename, onStatus, onDelete,
}: LevelPaneProps) => {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = records.filter((record) =>
    record.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const add = async () => {
    const name = draft.trim();
    if (!name) return;
    setBusyId("new");
    setError("");
    try {
      await onAdd(name);
      setDraft("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to add location."));
    } finally {
      setBusyId(null);
    }
  };

  const saveName = async (record: LocationRecord) => {
    const name = editDraft.trim();
    if (!name || name === record.name) {
      setEditingId(null);
      return;
    }
    setBusyId(record.id);
    setError("");
    try {
      await onRename(record, name);
      setEditingId(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to rename location."));
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (record: LocationRecord, status: LocationStatus) => {
    if (status === record.status) return;
    setBusyId(record.id);
    setError("");
    try {
      await onStatus(record, status);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to update status."));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (record: LocationRecord) => {
    setBusyId(record.id);
    setError("");
    try {
      await onDelete(record);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to deactivate location."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-semibold uppercase text-slate-700">{title}</h3>
          <p className="text-xs text-slate-400">{records.length} records</p>
        </div>
        <span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
          {resource}
        </span>
      </header>

      {error && <p className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {disabled ? (
        <div className="flex min-h-36 items-center justify-center px-4 py-8 text-center text-xs text-slate-400">
          {disabledMessage ?? "Select the parent record first."}
        </div>
      ) : (
        <>
          <form
            className="flex gap-2 border-b border-slate-100 p-3"
            onSubmit={(event) => { event.preventDefault(); void add(); }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={resource === "pincodes" ? "6-digit pincode" : `Add ${title.toLowerCase()}`}
              inputMode={resource === "pincodes" ? "numeric" : undefined}
              maxLength={resource === "pincodes" ? 10 : undefined}
              disabled={busyId !== null}
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={busyId !== null || !draft.trim()}
              aria-label={`Add ${title}`}
              title={`Add ${title}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white disabled:opacity-50"
              style={{ background: ACTIVE_BG }}
            >
              {busyId === "new" ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={16} />}
            </button>
          </form>

          {records.length > 6 && (
            <div className="border-b border-slate-100 px-3 py-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
          )}

          <div className="max-h-[460px] min-h-36 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((key) => <div key={key} className="h-10 animate-pulse rounded bg-slate-100" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-10 text-center text-xs italic text-slate-400">
                {records.length ? "No matching records." : `No ${title.toLowerCase()} found.`}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((record) => {
                  const selected = selectedId === record.id;
                  const busy = busyId === record.id;
                  return (
                    <li
                      key={record.id}
                      onClick={() => onSelect?.(record)}
                      className={`group flex min-w-0 items-center gap-2 px-2.5 py-2 ${onSelect ? "cursor-pointer" : ""} ${selected ? "bg-sky-50" : "hover:bg-slate-50"}`}
                    >
                      {editingId === record.id ? (
                        <>
                          <input
                            autoFocus
                            value={editDraft}
                            onChange={(event) => setEditDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") { event.preventDefault(); void saveName(record); }
                              if (event.key === "Escape") setEditingId(null);
                            }}
                            className="min-w-0 flex-1 rounded border border-sky-400 px-2 py-1 text-xs focus:outline-none"
                          />
                          <button type="button" onClick={(event) => { event.stopPropagation(); void saveName(record); }} aria-label="Save name" className="p-1 text-emerald-700"><span className="text-xs font-semibold">Save</span></button>
                          <button type="button" onClick={(event) => { event.stopPropagation(); setEditingId(null); }} aria-label="Cancel rename" className="p-1 text-slate-400"><X size={14} /></button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); onSelect?.(record); }}
                            className={`min-w-0 flex-1 truncate text-left text-xs ${selected ? "font-semibold text-sky-800" : "text-slate-700"}`}
                            title={record.name}
                          >
                            {record.name}
                          </button>
                          <select
                            value={record.status}
                            disabled={busy}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => void changeStatus(record, event.target.value as LocationStatus)}
                            aria-label={`${record.name} status`}
                            className={`max-w-[106px] rounded border px-1 py-1 text-[10px] ${record.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : record.status === "inactive" ? "border-slate-200 bg-slate-100 text-slate-600" : "border-amber-200 bg-amber-50 text-amber-800"}`}
                          >
                            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
                          </select>
                          {record.status === "inactive" && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={(event) => { event.stopPropagation(); void changeStatus(record, "active"); }}
                              aria-label={`Restore ${record.name}`}
                              title="Restore"
                              className="p-1 text-emerald-700 hover:text-emerald-900 disabled:opacity-40"
                            ><RotateCcw size={14} /></button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(event) => { event.stopPropagation(); setEditingId(record.id); setEditDraft(record.name); }}
                            aria-label={`Rename ${record.name}`}
                            title="Rename"
                            className="p-1 text-slate-400 hover:text-sky-700 disabled:opacity-40"
                          ><Pencil size={13} /></button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(event) => { event.stopPropagation(); void remove(record); }}
                            aria-label={`Deactivate ${record.name}`}
                            title="Deactivate (soft delete)"
                            className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-40"
                          >{busy ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}</button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
};

const LocationMasterAdmin = () => {
  const { showToast } = useToast();
  const [counts, setCounts] = useState<LocationCounts>(EMPTY_COUNTS);
  const [countsError, setCountsError] = useState("");
  const [browseError, setBrowseError] = useState("");
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [browsing, setBrowsing] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("soft");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"hierarchy" | "table">("hierarchy");
  const [tableSearch, setTableSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [tableData, setTableData] = useState<PincodeTablePage | null>(null);
  const [tableError, setTableError] = useState("");
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const [continents, setContinents] = useState<LocationRecord[]>([]);
  const [countries, setCountries] = useState<LocationRecord[]>([]);
  const [states, setStates] = useState<LocationRecord[]>([]);
  const [cities, setCities] = useState<LocationRecord[]>([]);
  const [pincodes, setPincodes] = useState<LocationRecord[]>([]);
  const [selectedContinentId, setSelectedContinentId] = useState<string | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [loadingResource, setLoadingResource] = useState<LocationResource | null>(null);

  const refreshCounts = async () => {
    const next = await getLocationCounts();
    setCounts(next);
  };

  useEffect(() => {
    getLocationCounts()
      .then((next) => { setCounts(next); setCountsError(""); })
      .catch((err) => setCountsError(getApiErrorMessage(err, "Unable to load location counts.")))
      .finally(() => setLoadingCounts(false));
  }, []);

  useEffect(() => {
    if (view !== "table") return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getPincodeTable(tableSearch, tablePage, 50)
        .then((result) => {
          if (cancelled) return;
          setTableData(result);
          setTableError("");
        })
        .catch((err) => {
          if (!cancelled) setTableError(getApiErrorMessage(err, "Unable to load pincode table."));
        })
        .finally(() => {
          if (!cancelled) setLoadingTable(false);
        });
    }, tableSearch ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [view, tableSearch, tablePage, tableRefreshKey]);

  const updateTableStatus = async (record: PincodeTableRow, status: LocationStatus) => {
    try {
      await updateLocationRecord("pincodes", record.id, { status });
      setTableData((current) => current ? {
        ...current,
        data: current.data.map((item) => item.id === record.id ? { ...item, status } : item),
      } : current);
      await refreshCounts();
      showToast("Pincode status updated", "success");
    } catch (err) {
      setTableError(getApiErrorMessage(err, "Unable to update pincode status."));
    }
  };

  const loadRecords = async (resource: LocationResource, parentId?: string) => {
    setLoadingResource(resource);
    try {
      const records = await getLocationRecords(resource, parentId);
      if (resource === "continents") setContinents(records);
      if (resource === "countries") setCountries(records);
      if (resource === "states") setStates(records);
      if (resource === "cities") setCities(records);
      if (resource === "pincodes") setPincodes(records);
      setBrowseError("");
      return records;
    } finally {
      setLoadingResource(null);
    }
  };

  const startBrowsing = async () => {
    setBrowsing(true);
    setBrowseError("");
    try {
      await loadRecords("continents");
    } catch (err) {
      setBrowseError(getApiErrorMessage(err, "Unable to load continents."));
    }
  };

  const selectContinent = async (record: LocationRecord) => {
    setSelectedContinentId(record.id);
    setSelectedCountryId(null);
    setSelectedStateId(null);
    setSelectedCityId(null);
    setCountries([]); setStates([]); setCities([]); setPincodes([]);
    try { await loadRecords("countries", record.id); }
    catch (err) { setBrowseError(getApiErrorMessage(err, "Unable to load countries.")); }
  };

  const selectCountry = async (record: LocationRecord) => {
    setSelectedCountryId(record.id);
    setSelectedStateId(null); setSelectedCityId(null);
    setStates([]); setCities([]); setPincodes([]);
    try { await loadRecords("states", record.id); }
    catch (err) { setBrowseError(getApiErrorMessage(err, "Unable to load states.")); }
  };

  const selectState = async (record: LocationRecord) => {
    setSelectedStateId(record.id);
    setSelectedCityId(null); setCities([]); setPincodes([]);
    try { await loadRecords("cities", record.id); }
    catch (err) { setBrowseError(getApiErrorMessage(err, "Unable to load cities.")); }
  };

  const selectCity = async (record: LocationRecord) => {
    setSelectedCityId(record.id);
    setPincodes([]);
    try { await loadRecords("pincodes", record.id); }
    catch (err) { setBrowseError(getApiErrorMessage(err, "Unable to load pincodes.")); }
  };

  const parentIdFor = (resource: LocationResource) => ({
    countries: selectedContinentId,
    states: selectedCountryId,
    cities: selectedStateId,
    pincodes: selectedCityId,
    continents: null,
  })[resource];

  const parentIsActive = (resource: LocationResource) => {
    if (resource === "continents") return true;
    const parentRecords = {
      countries: continents,
      states: countries,
      cities: states,
      pincodes: cities,
    }[resource];
    const parentId = parentIdFor(resource);
    return !!parentId && parentRecords.find((record) => record.id === parentId)?.status === "active";
  };

  const selectedPath = [
    continents.find((record) => record.id === selectedContinentId),
    countries.find((record) => record.id === selectedCountryId),
    states.find((record) => record.id === selectedStateId),
    cities.find((record) => record.id === selectedCityId),
  ].filter((record): record is LocationRecord => Boolean(record));
  const nextLevel = ["Continent", "Country", "State", "City", "Pincode"][selectedPath.length];

  const reloadResource = async (resource: LocationResource) => {
    await loadRecords(resource, parentIdFor(resource) ?? undefined);
    await refreshCounts();
  };

  const addRecord = async (resource: LocationResource, name: string) => {
    if (!parentIsActive(resource)) throw new Error("Select an active parent before adding this record.");
    if (resource === "pincodes" && !/^\d{6}$/.test(name)) throw new Error("Pincode must be exactly 6 digits.");
    await createLocationRecord(resource, name, parentIdFor(resource) ?? undefined);
    await reloadResource(resource);
    showToast(`${resource === "pincodes" ? "Pincode" : resource.slice(0, -1)} added`, "success");
  };

  const patchRecord = async (
    resource: LocationResource,
    record: LocationRecord,
    changes: { name?: string; status?: LocationStatus }
  ) => {
    if (changes.name && resource === "pincodes" && !/^\d{6}$/.test(changes.name)) {
      throw new Error("Pincode must be exactly 6 digits.");
    }
    await updateLocationRecord(resource, record.id, changes);
    await reloadResource(resource);
    showToast("Location updated", "success");
  };

  const removeRecord = async (resource: LocationResource, record: LocationRecord) => {
    const force = deleteMode === "force";
    const confirmation = force
      ? `Deactivate ${record.name} and all active descendants? You can restore inactive records later.`
      : `Deactivate ${record.name}? You can restore it later.`;
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    try {
      try {
        await deleteLocationRecord(resource, record.id, { force });
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 409 || deleteMode !== "soft") throw err;
        if (!window.confirm("This record has active children. Force-deactivate the entire subtree?")) return;
        await deleteLocationRecord(resource, record.id, { force: true });
      }
      await reloadResource(resource);
      showToast("Location deactivated. Use Restore if you need to undo.", "success");
    } finally {
      setBusy(false);
    }
  };

  const countCards: { label: string; key: keyof LocationCounts; tone: string }[] = [
    { label: "Continents", key: "totalContinents", tone: "border-l-sky-600" },
    { label: "Countries", key: "totalCountries", tone: "border-l-emerald-600" },
    { label: "States + Union Territories", key: "totalStates", tone: "border-l-amber-500" },
    { label: "Cities", key: "totalCities", tone: "border-l-rose-500" },
    { label: "Pincodes", key: "totalPincodes", tone: "border-l-teal-600" },
  ];

  return (
    <AdminLayout>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white shadow-sm" style={{ background: ACTIVE_BG }}><Globe size={19} /></div>
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase text-slate-400">Masters / Reference data</p>
            <h2 className="text-lg font-semibold text-slate-800">Location Master</h2>
            <p className="text-sm text-slate-500">Manage geographic records from continent down to pincode.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setLoadingCounts(true); getLocationCounts().then(setCounts).catch((err) => setCountsError(getApiErrorMessage(err, "Unable to load counts."))).finally(() => setLoadingCounts(false)); }} className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="mb-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Location management views">
        <button type="button" role="tab" aria-selected={view === "hierarchy"} onClick={() => setView("hierarchy")} className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition ${view === "hierarchy" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Browse hierarchy</button>
        <button type="button" role="tab" aria-selected={view === "table"} onClick={() => { setLoadingTable(true); setView("table"); }} className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition ${view === "table" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Pincode directory</button>
      </div>

      {countsError && <div className="mb-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{countsError}</span><button type="button" onClick={() => { setLoadingCounts(true); getLocationCounts().then(setCounts).then(() => setCountsError("")).catch((err) => setCountsError(getApiErrorMessage(err, "Unable to load counts."))).finally(() => setLoadingCounts(false)); }} className="font-semibold underline">Retry</button></div>}

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {countCards.map(({ label, key }) => (
          <div key={key} className={`rounded-md border border-l-[3px] border-slate-200 bg-white px-3 py-3 ${countCards.find((card) => card.key === key)?.tone}`}>
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-800">{loadingCounts ? "…" : counts[key].toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>

      {view === "table" ? (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">All pincodes</h3>
              <p className="text-xs text-slate-500">Search by pincode, city, or state.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={tableSearch}
                  onChange={(event) => { setLoadingTable(true); setTableSearch(event.target.value); setTablePage(1); }}
                  placeholder="Search locations..."
                  className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-xs sm:w-60"
                />
              </div>
              <button type="button" onClick={() => { setLoadingTable(true); setTableRefreshKey((key) => key + 1); }} aria-label="Refresh pincode table" title="Refresh" className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /></button>
            </div>
          </div>
          {tableError && <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{tableError}</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr><th className="px-3 py-2.5">Pincode</th><th className="px-3 py-2.5">City</th><th className="px-3 py-2.5">State</th><th className="px-3 py-2.5">Country</th><th className="px-3 py-2.5">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingTable ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400">Loading pincodes...</td></tr>
                ) : tableData?.data.length ? tableData.data.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-mono font-medium text-slate-800">{record.pincode}</td>
                    <td className="px-3 py-2.5 text-slate-700">{record.city || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-700">{record.state || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-700">{record.country || "—"}</td>
                    <td className="px-3 py-2.5">
                      <select value={record.status} onChange={(event) => void updateTableStatus(record, event.target.value as LocationStatus)} aria-label={`${record.pincode} status`} className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700">
                        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
                      </select>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400">{tableError ? "Unable to load pincodes." : "No pincodes found."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2.5">
            <p className="text-xs text-slate-500">{tableData ? `${tableData.total.toLocaleString("en-IN")} total` : ""}</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Page {tableData?.page ?? tablePage} of {tableData?.totalPages ?? 1}</span>
              <button type="button" disabled={loadingTable || tablePage <= 1} onClick={() => { setLoadingTable(true); setTablePage((page) => Math.max(1, page - 1)); }} className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-700 disabled:opacity-40">Previous</button>
              <button type="button" disabled={loadingTable || tablePage >= (tableData?.totalPages ?? 1)} onClick={() => { setLoadingTable(true); setTablePage((page) => page + 1); }} className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-700 disabled:opacity-40">Next</button>
            </div>
          </div>
        </section>
      ) : !browsing ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <MapPin size={24} className="mb-3 text-slate-400" />
          <p className="text-sm font-semibold text-slate-800">Start browsing the hierarchy</p>
          <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Choose a continent, then a country, state, and city to load records one level at a time. Counts above load independently.</p>
          <button type="button" onClick={() => void startBrowsing()} className="mt-4 flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white" style={{ background: ACTIVE_BG }}>
            <Globe size={15} /> Browse continents
          </button>
        </div>
      ) : (
        <>
          {browseError && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{browseError}</div>}
          <div className="mb-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-slate-400">Selected path</p>
              <div className="mt-1 flex min-h-5 flex-wrap items-center gap-1.5 text-xs">
                {selectedPath.length ? selectedPath.map((record, index) => (
                  <span key={record.id} className="inline-flex items-center gap-1.5">
                    {index > 0 && <span className="text-slate-300">/</span>}
                    <span className="font-medium text-slate-700">{record.name}</span>
                  </span>
                )) : <span className="text-slate-400">No selection yet</span>}
                {nextLevel && <span className="ml-1 text-sky-700">Next: {nextLevel}</span>}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">All statuses are visible here; only active records appear in applicant forms.</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <label className="text-[11px] text-slate-500" htmlFor="location-delete-mode">Delete behavior</label>
              <select id="location-delete-mode" value={deleteMode} onChange={(event) => setDeleteMode(event.target.value as DeleteMode)} className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700">
                <option value="soft">Deactivate only</option>
                <option value="force">Deactivate subtree (restorable)</option>
              </select>
              <button type="button" onClick={() => void startBrowsing()} aria-label="Reload continents" title="Reload hierarchy" className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"><RefreshCw size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <LocationLevelPane title="Continents" resource="continents" records={continents} selectedId={selectedContinentId} loading={loadingResource === "continents"} onSelect={(record) => void selectContinent(record)} onAdd={(name) => addRecord("continents", name)} onRename={(record, name) => patchRecord("continents", record, { name })} onStatus={(record, status) => patchRecord("continents", record, { status })} onDelete={(record) => removeRecord("continents", record)} />
            <LocationLevelPane title="Countries" resource="countries" records={countries} selectedId={selectedCountryId} disabled={!selectedContinentId} disabledMessage="Select a continent first." loading={loadingResource === "countries"} onSelect={(record) => void selectCountry(record)} onAdd={(name) => addRecord("countries", name)} onRename={(record, name) => patchRecord("countries", record, { name })} onStatus={(record, status) => patchRecord("countries", record, { status })} onDelete={(record) => removeRecord("countries", record)} />
            <LocationLevelPane title="States" resource="states" records={states} selectedId={selectedStateId} disabled={!selectedCountryId} disabledMessage="Select a country first." loading={loadingResource === "states"} onSelect={(record) => void selectState(record)} onAdd={(name) => addRecord("states", name)} onRename={(record, name) => patchRecord("states", record, { name })} onStatus={(record, status) => patchRecord("states", record, { status })} onDelete={(record) => removeRecord("states", record)} />
            <LocationLevelPane title="Cities" resource="cities" records={cities} selectedId={selectedCityId} disabled={!selectedStateId} disabledMessage="Select a state first." loading={loadingResource === "cities"} onSelect={(record) => void selectCity(record)} onAdd={(name) => addRecord("cities", name)} onRename={(record, name) => patchRecord("cities", record, { name })} onStatus={(record, status) => patchRecord("cities", record, { status })} onDelete={(record) => removeRecord("cities", record)} />
            <LocationLevelPane title="Pincodes" resource="pincodes" records={pincodes} disabled={!selectedCityId} disabledMessage="Select a city first." loading={loadingResource === "pincodes"} onAdd={(name) => addRecord("pincodes", name)} onRename={(record, name) => patchRecord("pincodes", record, { name })} onStatus={(record, status) => patchRecord("pincodes", record, { status })} onDelete={(record) => removeRecord("pincodes", record)} />
          </div>
        </>
      )}

      {busy && <span className="sr-only">Updating location record</span>}
    </AdminLayout>
  );
};

export default LocationMasterAdmin;
