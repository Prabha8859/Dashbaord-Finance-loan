import { useEffect, useRef, useState } from "react";
import {
  Check, ChevronRight, Globe, MapPin,
  Pencil, Plus, RefreshCw, Trash2, X, AlignLeft,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { useToast } from "../../context/ToastContext";
import {
  getMasters, getMaster,
  addCity, addState,
  deleteCity, deleteState,
  getApiErrorMessage, updateCity,
} from "../../api/masters";

interface EditingCity { original: string; draft: string; }

const activeBg = "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))";

// ── Parse bulk input (comma or newline separated) ─────────────────────────────
const parseBulk = (raw: string): string[] =>
  raw
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);

const StatesCitiesManager = () => {
  const { showToast } = useToast();

  const [states,    setStatesList] = useState<string[] | null>(null);
  const [citiesMap, setCitiesMap]  = useState<Record<string, string[]>>({});
  const [loadError, setLoadError]  = useState("");

  const [selectedState,   setSelectedState]   = useState<string | null>(null);

  // ── States input — toggle between single & bulk ───────────────────────────
  const [stateBulkMode,   setStateBulkMode]   = useState(false);
  const [stateInput,      setStateInput]      = useState("");
  const [stateBulkInput,  setStateBulkInput]  = useState("");
  const [stateInputError, setStateInputError] = useState("");
  const [savingState,     setSavingState]     = useState(false);
  const [deletingState,   setDeletingState]   = useState<string | null>(null);

  // ── Cities input — toggle between single & bulk ───────────────────────────
  const [cityBulkMode,   setCityBulkMode]   = useState(false);
  const [cityInput,      setCityInput]      = useState("");
  const [cityBulkInput,  setCityBulkInput]  = useState("");
  const [cityInputError, setCityInputError] = useState("");
  const [savingCity,     setSavingCity]     = useState(false);
  const [deletingCity,   setDeletingCity]   = useState<string | null>(null);
  const [editingCity,    setEditingCity]    = useState<EditingCity | null>(null);
  const [savingEdit,     setSavingEdit]     = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoadError("");
    setStatesList(null);
    try {
      const list = await getMasters();
      const statesMaster        = list.find(m => m.type === "states");
      const citiesByStateMaster = list.find(m => m.type === "citiesByState");
      let stateValues: string[] = [];
      let citiesValues: Record<string, string[]> = {};
      if (statesMaster) {
        const d = await getMaster(statesMaster._id);
        stateValues = Array.isArray(d.values) ? (d.values as string[]) : [];
      }
      if (citiesByStateMaster) {
        const d = await getMaster(citiesByStateMaster._id);
        if (d.values && typeof d.values === "object" && !Array.isArray(d.values))
          citiesValues = d.values as Record<string, string[]>;
      }
      setStatesList(stateValues);
      setCitiesMap(citiesValues);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Unable to load data."));
    }
  };
  useEffect(() => { load(); }, []);

  const cities = selectedState != null ? (citiesMap[selectedState] ?? []) : null;

  const handleSelectState = (state: string) => {
    setSelectedState(state);
    setCityInput(""); setCityBulkInput(""); setCityInputError(""); setEditingCity(null);
  };

  // ── Add single state ──────────────────────────────────────────────────────
  const handleAddState = async () => {
    const val = stateInput.trim();
    if (!val) { setStateInputError("Enter a state name"); return; }
    if (states?.some(s => s.toLowerCase() === val.toLowerCase())) {
      setStateInputError(`"${val}" already exists`); return;
    }
    setSavingState(true); setStateInputError("");
    try {
      await addState(val);
      setStatesList(prev => [...(prev ?? []), val]);
      setCitiesMap(prev => ({ ...prev, [val]: [] }));
      setStateInput("");
      showToast(`"${val}" added`, "success");
    } catch (err) { showToast(getApiErrorMessage(err, "Unable to add state."), "error"); }
    finally { setSavingState(false); }
  };

  // ── Bulk add states ───────────────────────────────────────────────────────
  const handleBulkAddStates = async () => {
    const items = parseBulk(stateBulkInput);
    if (items.length === 0) { setStateInputError("Enter at least one state"); return; }

    const existing = new Set((states ?? []).map(s => s.toLowerCase()));
    const newItems = items.filter(v => !existing.has(v.toLowerCase()));
    const dupes    = items.filter(v =>  existing.has(v.toLowerCase()));

    if (newItems.length === 0) {
      setStateInputError(`All ${items.length} already exist`); return;
    }
    setSavingState(true); setStateInputError("");
    let added = 0;
    for (const val of newItems) {
      try {
        await addState(val);
        setStatesList(prev => [...(prev ?? []), val]);
        setCitiesMap(prev => ({ ...prev, [val]: [] }));
        added++;
      } catch { /* skip failed ones */ }
    }
    setStateBulkInput("");
    const msg = dupes.length > 0
      ? `${added} added, ${dupes.length} skipped (already existed)`
      : `${added} state${added !== 1 ? "s" : ""} added`;
    showToast(msg, "success");
    setSavingState(false);
  };

  // ── Delete state ──────────────────────────────────────────────────────────
  const handleDeleteState = async (state: string) => {
    setDeletingState(state);
    try {
      await deleteState(state);
      setStatesList(prev => (prev ?? []).filter(s => s !== state));
      setCitiesMap(prev => { const n = { ...prev }; delete n[state]; return n; });
      if (selectedState === state) setSelectedState(null);
      showToast(`"${state}" removed`, "success");
    } catch (err) { showToast(getApiErrorMessage(err, "Unable to delete state."), "error"); }
    finally { setDeletingState(null); }
  };

  // ── Add single city ───────────────────────────────────────────────────────
  const handleAddCity = async () => {
    if (!selectedState) return;
    const val = cityInput.trim();
    if (!val) { setCityInputError("Enter a city name"); return; }
    if (cities?.some(c => c.toLowerCase() === val.toLowerCase())) {
      setCityInputError(`"${val}" already exists`); return;
    }
    setSavingCity(true); setCityInputError("");
    try {
      await addCity(selectedState, val);
      setCitiesMap(prev => ({ ...prev, [selectedState]: [...(prev[selectedState] ?? []), val] }));
      setCityInput("");
      showToast(`"${val}" added`, "success");
    } catch (err) { showToast(getApiErrorMessage(err, "Unable to add city."), "error"); }
    finally { setSavingCity(false); }
  };

  // ── Bulk add cities ───────────────────────────────────────────────────────
  const handleBulkAddCities = async () => {
    if (!selectedState) return;
    const items = parseBulk(cityBulkInput);
    if (items.length === 0) { setCityInputError("Enter at least one city"); return; }

    const existing = new Set((citiesMap[selectedState] ?? []).map(c => c.toLowerCase()));
    const newItems = items.filter(v => !existing.has(v.toLowerCase()));
    const dupes    = items.filter(v =>  existing.has(v.toLowerCase()));

    if (newItems.length === 0) {
      setCityInputError(`All ${items.length} already exist`); return;
    }
    setSavingCity(true); setCityInputError("");
    let added = 0;
    for (const val of newItems) {
      try {
        await addCity(selectedState, val);
        setCitiesMap(prev => ({
          ...prev,
          [selectedState]: [...(prev[selectedState] ?? []), val],
        }));
        added++;
      } catch { /* skip failed */ }
    }
    setCityBulkInput("");
    const msg = dupes.length > 0
      ? `${added} added, ${dupes.length} skipped (already existed)`
      : `${added} cit${added !== 1 ? "ies" : "y"} added to ${selectedState}`;
    showToast(msg, "success");
    setSavingCity(false);
  };

  // ── Edit city ─────────────────────────────────────────────────────────────
  const startEditCity = (city: string) => {
    setEditingCity({ original: city, draft: city });
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveEditCity = async () => {
    if (!selectedState || !editingCity) return;
    const newName = editingCity.draft.trim();
    if (!newName || newName === editingCity.original) { setEditingCity(null); return; }
    if (cities?.some(c => c !== editingCity.original && c.toLowerCase() === newName.toLowerCase())) {
      showToast(`"${newName}" already exists`, "error"); return;
    }
    setSavingEdit(true);
    try {
      await updateCity(selectedState, editingCity.original, newName);
      setCitiesMap(prev => ({
        ...prev,
        [selectedState]: (prev[selectedState] ?? []).map(c => c === editingCity.original ? newName : c),
      }));
      setEditingCity(null);
      showToast(`Renamed to "${newName}"`, "success");
    } catch (err) { showToast(getApiErrorMessage(err, "Unable to rename city."), "error"); }
    finally { setSavingEdit(false); }
  };

  // ── Delete city ───────────────────────────────────────────────────────────
  const handleDeleteCity = async (city: string) => {
    if (!selectedState) return;
    setDeletingCity(city);
    try {
      await deleteCity(selectedState, city);
      setCitiesMap(prev => ({
        ...prev,
        [selectedState]: (prev[selectedState] ?? []).filter(c => c !== city),
      }));
      if (editingCity?.original === city) setEditingCity(null);
      showToast(`"${city}" removed`, "success");
    } catch (err) { showToast(getApiErrorMessage(err, "Unable to delete city."), "error"); }
    finally { setDeletingCity(null); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="flex items-center gap-2 mb-6">
        <Globe size={18} style={{ color: "rgb(0, 102, 153)" }} />
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "rgb(0, 102, 153)" }}>State &amp; City</h2>
          <p className="text-sm text-slate-500">Manage states and their cities used in loan application forms.</p>
        </div>
      </div>

      {loadError ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center gap-3 py-16 text-center px-6">
          <p className="text-sm text-red-600">{loadError}</p>
          <button onClick={load} className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-50 transition">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ══ LEFT: States ══════════════════════════════════════════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-200 bg-slate-50">
              <Globe size={14} style={{ color: "rgb(0, 102, 153)" }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(0, 102, 153)" }}>States</span>
              {states !== null && (
                <span className="ml-auto text-xs text-slate-400">{states.length} {states.length === 1 ? "state" : "states"}</span>
              )}
            </div>

            {/* Input area */}
            <div className="px-4 py-3 border-b border-slate-100 space-y-2">
              {/* Mode toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {stateBulkMode ? "Bulk add (comma or newline)" : "Add single state"}
                </span>
                <button
                  onClick={() => { setStateBulkMode(m => !m); setStateInputError(""); }}
                  className="flex items-center gap-1 text-xs text-[rgb(0,102,153)] hover:underline transition"
                >
                  <AlignLeft size={12} />
                  {stateBulkMode ? "Single" : "Bulk add"}
                </button>
              </div>

              {stateBulkMode ? (
                <>
                  <textarea
                    value={stateBulkInput}
                    onChange={e => { setStateBulkInput(e.target.value); setStateInputError(""); }}
                    placeholder={"Delhi\nMaharashtra\nUttar Pradesh\n\nor: Delhi, Maharashtra, Uttar Pradesh"}
                    disabled={savingState}
                    rows={4}
                    className={`w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] disabled:bg-slate-50 ${stateInputError ? "border-red-400" : "border-slate-300"}`}
                  />
                  {stateInputError && <p className="text-xs text-red-600">{stateInputError}</p>}
                  <button
                    onClick={handleBulkAddStates}
                    disabled={savingState || !stateBulkInput.trim()}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50 hover:brightness-110 transition"
                    style={{ background: activeBg }}
                  >
                    {savingState ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add All States
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input value={stateInput}
                      onChange={e => { setStateInput(e.target.value); setStateInputError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleAddState()}
                      placeholder="e.g. Maharashtra" disabled={savingState}
                      className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] disabled:bg-slate-50 ${stateInputError ? "border-red-400" : "border-slate-300"}`}
                    />
                    {stateInputError && <p className="text-xs text-red-600 mt-1">{stateInputError}</p>}
                  </div>
                  <button onClick={handleAddState} disabled={savingState}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white shrink-0 disabled:opacity-50 hover:brightness-110 transition"
                    style={{ background: activeBg }}>
                    {savingState ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Add
                  </button>
                </div>
              )}
            </div>

            {/* States list */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 380 }}>
              {states === null ? (
                <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-md bg-slate-100 animate-pulse" />)}</div>
              ) : states.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-12 text-center">No states yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {states.map(state => {
                    const isSelected = selectedState === state;
                    const isDeleting = deletingState === state;
                    return (
                      <div key={state} onClick={() => handleSelectState(state)}
                        className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition ${isSelected ? "bg-[rgba(0,102,153,0.06)]" : "hover:bg-slate-50"}`}>
                        <MapPin size={13} className={`shrink-0 ${isSelected ? "text-[rgb(0,102,153)]" : "text-slate-300"}`} />
                        <span className={`flex-1 text-sm font-medium truncate ${isSelected ? "text-[rgb(0,102,153)]" : "text-slate-700"}`}>{state}</span>
                        <span className="text-xs text-slate-400 shrink-0">{(citiesMap[state] ?? []).length}</span>
                        {isSelected && <ChevronRight size={13} className="text-[rgb(0,102,153)] shrink-0" />}
                        <button onClick={e => { e.stopPropagation(); handleDeleteState(state); }} disabled={isDeleting}
                          aria-label={`Delete ${state}`}
                          className="shrink-0 p-1.5 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition disabled:opacity-40">
                          {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══ RIGHT: Cities ══════════════════════════════════════════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-200 bg-slate-50">
              <MapPin size={14} style={{ color: "rgb(0, 102, 153)" }} />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(0, 102, 153)" }}>
                {selectedState ? <><span className="font-normal">Cities —</span> {selectedState}</> : "Cities"}
              </span>
              {selectedState && (
                <span className="ml-auto text-xs text-slate-400">{(citiesMap[selectedState] ?? []).length} cities</span>
              )}
            </div>

            {!selectedState ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <MapPin size={20} className="text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">Select a state to manage its cities.</p>
              </div>
            ) : (
              <>
                {/* Input area */}
                <div className="px-4 py-3 border-b border-slate-100 space-y-2">
                  {/* Mode toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      {cityBulkMode ? "Bulk add (comma or newline)" : "Add single city"}
                    </span>
                    <button
                      onClick={() => { setCityBulkMode(m => !m); setCityInputError(""); }}
                      className="flex items-center gap-1 text-xs text-[rgb(0,102,153)] hover:underline transition"
                    >
                      <AlignLeft size={12} />
                      {cityBulkMode ? "Single" : "Bulk add"}
                    </button>
                  </div>

                  {cityBulkMode ? (
                    <>
                      <textarea
                        value={cityBulkInput}
                        onChange={e => { setCityBulkInput(e.target.value); setCityInputError(""); }}
                        placeholder={"Mumbai\nPune\nNagpur\n\nor: Mumbai, Pune, Nagpur"}
                        disabled={savingCity}
                        rows={4}
                        className={`w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] disabled:bg-slate-50 ${cityInputError ? "border-red-400" : "border-slate-300"}`}
                      />
                      {cityInputError && <p className="text-xs text-red-600">{cityInputError}</p>}
                      <button
                        onClick={handleBulkAddCities}
                        disabled={savingCity || !cityBulkInput.trim()}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50 hover:brightness-110 transition"
                        style={{ background: activeBg }}
                      >
                        {savingCity ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                        Add All Cities
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input value={cityInput}
                          onChange={e => { setCityInput(e.target.value); setCityInputError(""); }}
                          onKeyDown={e => e.key === "Enter" && handleAddCity()}
                          placeholder="e.g. Mumbai" disabled={savingCity}
                          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] disabled:bg-slate-50 ${cityInputError ? "border-red-400" : "border-slate-300"}`}
                        />
                        {cityInputError && <p className="text-xs text-red-600 mt-1">{cityInputError}</p>}
                      </div>
                      <button onClick={handleAddCity} disabled={savingCity}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white shrink-0 disabled:opacity-50 hover:brightness-110 transition"
                        style={{ background: activeBg }}>
                        {savingCity ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Cities list */}
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: 380 }}>
                  {(cities ?? []).length === 0 ? (
                    <p className="text-sm text-slate-400 italic py-12 text-center">No cities yet for {selectedState}.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {(cities ?? []).map(city => {
                        const isEditingThis  = editingCity?.original === city;
                        const isDeletingThis = deletingCity === city;
                        return (
                          <div key={city} className="group flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                            {isEditingThis ? (
                              <div className="flex flex-1 items-center gap-2 min-w-0">
                                <input ref={editInputRef} value={editingCity.draft}
                                  onChange={e => setEditingCity(prev => prev ? { ...prev, draft: e.target.value } : null)}
                                  onKeyDown={e => { if (e.key === "Enter") handleSaveEditCity(); if (e.key === "Escape") setEditingCity(null); }}
                                  className="flex-1 min-w-0 rounded-md border border-[rgb(0,102,153)] px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)]"
                                />
                                <button onClick={handleSaveEditCity} disabled={savingEdit || !editingCity.draft.trim()} aria-label="Save"
                                  className="p-1.5 rounded-md text-white disabled:opacity-50 hover:brightness-110 transition" style={{ background: activeBg }}>
                                  {savingEdit ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                                </button>
                                <button onClick={() => setEditingCity(null)} disabled={savingEdit} aria-label="Cancel"
                                  className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition">
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1 text-sm text-slate-700 truncate">{city}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                  <button onClick={() => startEditCity(city)} aria-label={`Edit ${city}`}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-[rgb(0,102,153)] hover:bg-[rgba(0,102,153,0.06)] transition">
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => handleDeleteCity(city)} disabled={isDeletingThis} aria-label={`Delete ${city}`}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40">
                                    {isDeletingThis ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default StatesCitiesManager;
