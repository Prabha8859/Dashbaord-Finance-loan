import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  AlertTriangle, AlignLeft, Building2, Check, Globe, Hash, MapPin,
  Pencil, Plus, RefreshCw, Trash2, X,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../utils/apiError";
import { LOCATION_MASTER_LABELS, LOCATION_MASTER_TYPES } from "../../constants/masterTypes";
import {
  ensureMasters,
  getMasterByType,
  isGroupedValues,
  updateMasterValues,
  type MasterDetail,
  type MasterGroupedValues,
  type MasterValues,
} from "../../api/masters";

// ── Local helpers ─────────────────────────────────────────────────────────────

const activeBg = "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))";

const toList = (values: MasterValues | undefined): string[] =>
  Array.isArray(values) ? values.filter((v): v is string => typeof v === "string") : [];

const toGrouped = (values: MasterValues | undefined): Record<string, string[]> => {
  if (!values || !isGroupedValues(values)) return {};
  const grouped = values as MasterGroupedValues;
  return Object.fromEntries(
    Object.entries(grouped).map(([key, list]) => [
      key,
      list.filter((v): v is string => typeof v === "string"),
    ])
  );
};

const hasValue = (list: string[], candidate: string) =>
  list.some((v) => v.trim().toLowerCase() === candidate.trim().toLowerCase());

/** Case-insensitive key lookup for grouped maps (states/cities/pincodes). */
const findKey = (map: Record<string, string[]>, name: string): string | undefined =>
  Object.keys(map).find((k) => k.trim().toLowerCase() === name.trim().toLowerCase());

const bulkItems = (raw: string): string[] =>
  raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

/** Indian PIN codes are 6 digits; we accept 3–10 digits to stay country-agnostic. */
const validatePincode = (value: string): string | null =>
  /^\d{3,10}$/.test(value.trim()) ? null : "Enter a numeric pincode (3–10 digits)";

// ── Add form (single + optional bulk) ─────────────────────────────────────────

interface AddValueFormProps {
  onAdd: (value: string) => Promise<void>;
  placeholder: string;
  bulkPlaceholder?: string;
  allowBulk?: boolean;
  disabled?: boolean;
  validate?: (value: string) => string | null;
  buttonLabel?: string;
}

const AddValueForm = ({
  onAdd, placeholder, bulkPlaceholder, allowBulk = false,
  disabled = false, validate, buttonLabel = "Add",
}: AddValueFormProps) => {
  const [bulkMode, setBulkMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [bulkDraft, setBulkDraft] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submitSingle = async () => {
    const value = draft.trim();
    if (!value) { setError("Enter a value first"); return; }
    const invalid = validate?.(value);
    if (invalid) { setError(invalid); return; }
    setSaving(true); setError("");
    try { await onAdd(value); setDraft(""); }
    catch (err) { setError(getApiErrorMessage(err, "Unable to add.")); }
    finally { setSaving(false); }
  };

  const submitBulk = async () => {
    const items = bulkItems(bulkDraft);
    if (items.length === 0) { setError("Enter at least one value"); return; }
    setSaving(true); setError("");
    let added = 0;
    const skipped: string[] = [];
    for (const value of items) {
      const invalid = validate?.(value);
      if (invalid) { skipped.push(`${value} (${invalid})`); continue; }
      try { await onAdd(value); added++; }
      catch { skipped.push(value); }
    }
    setSaving(false);
    setBulkDraft("");
    setError(
      skipped.length === 0
        ? ""
        : `${added} added · skipped ${skipped.length}: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? "…" : ""}`
    );
  };

  return (
    <div className="space-y-2">
      {allowBulk && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {bulkMode ? "Bulk add (comma or newline)" : "Add one at a time"}
          </span>
          <button
            type="button"
            onClick={() => { setBulkMode((m) => !m); setError(""); }}
            className="flex items-center gap-1 text-xs text-[rgb(0,102,153)] hover:underline transition"
          >
            <AlignLeft size={12} />
            {bulkMode ? "Single" : "Bulk add"}
          </button>
        </div>
      )}

      {bulkMode ? (
        <>
          <textarea
            value={bulkDraft}
            onChange={(e) => { setBulkDraft(e.target.value); setError(""); }}
            placeholder={bulkPlaceholder}
            disabled={disabled || saving}
            rows={4}
            className={`w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] disabled:bg-slate-50 ${
              error ? "border-red-400" : "border-slate-300"
            }`}
          />
          <button
            type="button"
            onClick={submitBulk}
            disabled={disabled || saving || !bulkDraft.trim()}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50 hover:brightness-110 transition"
            style={{ background: activeBg }}
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            Add All
          </button>
        </>
      ) : (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitSingle(); } }}
            placeholder={placeholder}
            disabled={disabled || saving}
            inputMode={validate ? "numeric" : undefined}
            className={`flex-1 min-w-0 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] disabled:bg-slate-50 ${
              error ? "border-red-400" : "border-slate-300"
            }`}
          />
          <button
            type="button"
            onClick={submitSingle}
            disabled={disabled || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white shrink-0 disabled:opacity-50 hover:brightness-110 transition"
            style={{ background: activeBg }}
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            {buttonLabel}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

// ── Level pane ────────────────────────────────────────────────────────────────

interface LevelPaneProps {
  title: string;
  subtitle?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  items: string[];
  selected?: string | null;
  onSelect?: (value: string) => void;
  onAdd: (value: string) => Promise<void>;
  onDelete: (value: string) => Promise<void>;
  onRename?: (oldValue: string, newValue: string) => Promise<void>;
  addPlaceholder: string;
  bulkPlaceholder?: string;
  allowBulk?: boolean;
  validate?: (value: string) => string | null;
  emptyHint: string;
  disabledHint?: boolean;
  disabledMessage?: string;
  loading?: boolean;
}

const LevelPane = ({
  title, subtitle, icon: Icon, items, selected, onSelect,
  onAdd, onDelete, onRename, addPlaceholder, bulkPlaceholder,
  allowBulk = false, validate, emptyHint, disabledHint = false,
  disabledMessage, loading = false,
}: LevelPaneProps) => {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ original: string; draft: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionError, setActionError] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const startEdit = (value: string) => {
    setEditing({ original: value, draft: value });
    setActionError("");
    setTimeout(() => editRef.current?.focus(), 50);
  };

  const saveEdit = async () => {
    if (!editing || !onRename) return;
    const next = editing.draft.trim();
    if (!next || next === editing.original) { setEditing(null); return; }
    setSavingEdit(true);
    try {
      await onRename(editing.original, next);
      setEditing(null);
      setActionError("");
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Unable to rename."));
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-200 bg-slate-50">
        <Icon size={14} className="text-[rgb(0,102,153)]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(0,102,153)]">
          {title}
        </span>
        <span className="ml-auto text-xs text-slate-400">
          {subtitle ?? `${items.length} ${items.length === 1 ? "item" : "items"}`}
        </span>
      </div>

      {actionError && (
        <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
          {actionError}
        </p>
      )}

      {disabledHint ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
          <Icon size={22} className="text-slate-300" />
          <p className="text-sm text-slate-400">{disabledMessage}</p>
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-b border-slate-100">
            <AddValueForm
              onAdd={onAdd}
              placeholder={addPlaceholder}
              bulkPlaceholder={bulkPlaceholder}
              allowBulk={allowBulk}
              validate={validate}
            />
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 360 }}>
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-md bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-12 text-center px-4">{emptyHint}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const isSelected = selected === item;
                  const isDeleting = deleting === item;
                  const isEditing = editing?.original === item;
                  return (
                    <div
                      key={item}
                      onClick={() => onSelect && !isEditing && onSelect(item)}
                      className={`group flex items-center gap-2 px-4 py-2.5 transition ${
                        onSelect ? "cursor-pointer" : ""
                      } ${isSelected ? "bg-[rgba(0,102,153,0.06)]" : "hover:bg-slate-50"}`}
                    >
                      {isEditing ? (
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <input
                            ref={editRef}
                            value={editing.draft}
                            onChange={(e) =>
                              setEditing((prev) => (prev ? { ...prev, draft: e.target.value } : null))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") setEditing(null);
                            }}
                            className="flex-1 min-w-0 rounded-md border border-[rgb(0,102,153)] px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)]"
                          />
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={savingEdit || !editing.draft.trim()}
                            aria-label="Save"
                            className="p-1.5 rounded-md text-white disabled:opacity-50 hover:brightness-110 transition"
                            style={{ background: activeBg }}
                          >
                            {savingEdit ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            disabled={savingEdit}
                            aria-label="Cancel"
                            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isSelected ? "bg-[rgb(0,102,153)]" : "bg-slate-300"
                            }`}
                          />
                          <span
                            className={`flex-1 text-sm truncate ${
                              isSelected ? "font-semibold text-[rgb(0,102,153)]" : "text-slate-700"
                            }`}
                          >
                            {item}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            {onRename && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                                aria-label={`Rename ${item}`}
                                className="p-1.5 rounded-md text-slate-400 hover:text-[rgb(0,102,153)] hover:bg-[rgba(0,102,153,0.06)] transition"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setDeleting(item);
                                try {
                                  await onDelete(item);
                                  setActionError("");
                                } catch (err) {
                                  setActionError(getApiErrorMessage(err, "Unable to delete."));
                                } finally {
                                  setDeleting(null);
                                }
                              }}
                              disabled={isDeleting}
                              aria-label={`Delete ${item}`}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                            >
                              {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const LocationsManager = () => {
  const { showToast } = useToast();

  const [loadError, setLoadError] = useState("");
  const [shapeNotice, setShapeNotice] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [masterIds, setMasterIds] = useState<Record<string, string>>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [statesByCountry, setStatesByCountry] = useState<Record<string, string[]>>({});
  const [citiesByState, setCitiesByState] = useState<Record<string, string[]>>({});
  const [pincodesByCity, setPincodesByCity] = useState<Record<string, string[]>>({});

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // ── Load (and one-time migration of the legacy flat `states` master) ──────
  const load = async () => {
    setLoading(true);
    setLoadError("");
    setShapeNotice([]);
    try {
      const masters: Record<string, MasterDetail> = await ensureMasters([
        { type: LOCATION_MASTER_TYPES.countries, label: LOCATION_MASTER_LABELS.countries, values: [] },
        { type: LOCATION_MASTER_TYPES.states, label: LOCATION_MASTER_LABELS.statesByCountry, values: {} },
        { type: LOCATION_MASTER_TYPES.cities, label: LOCATION_MASTER_LABELS.citiesByState, values: {} },
        { type: LOCATION_MASTER_TYPES.pincodes, label: LOCATION_MASTER_LABELS.pincodesByCity, values: {} },
      ]);

      setMasterIds(
        Object.fromEntries(Object.entries(masters).map(([type, m]) => [type, m._id]))
      );

      let nextCountries = toList(masters[LOCATION_MASTER_TYPES.countries]?.values);
      let nextStates = toGrouped(masters[LOCATION_MASTER_TYPES.states]?.values);
      const nextCities = toGrouped(masters[LOCATION_MASTER_TYPES.cities]?.values);
      const nextPincodes = toGrouped(masters[LOCATION_MASTER_TYPES.pincodes]?.values);

      // A grouped master must hold an object. If the backend currently stores it
      // as a flat array, it refuses shape changes (400) — so writing the grouped
      // migration would fail and blank the whole page. Skip the write, keep the
      // rest of the cascade usable, and tell the admin exactly what to fix.
      const flat: string[] = [
        Array.isArray(masters[LOCATION_MASTER_TYPES.states]?.values) ? LOCATION_MASTER_LABELS.statesByCountry : "",
        Array.isArray(masters[LOCATION_MASTER_TYPES.cities]?.values) ? LOCATION_MASTER_LABELS.citiesByState : "",
        Array.isArray(masters[LOCATION_MASTER_TYPES.pincodes]?.values) ? LOCATION_MASTER_LABELS.pincodesByCity : "",
      ].filter(Boolean);
      if (flat.length > 0) {
        setShapeNotice(flat);
      }

      // Migrate the legacy flat `states` master into a "India" country group the
      // first time this page runs against an older database.
      const statesStoredAsList = Array.isArray(masters[LOCATION_MASTER_TYPES.states]?.values);
      if (Object.keys(nextStates).length === 0 && !statesStoredAsList) {
        const legacy = await getMasterByType("states").catch(() => null);
        const legacyStates = legacy ? toList(legacy.values) : [];
        if (legacyStates.length > 0) {
          nextStates = { India: legacyStates };
          const stateMasterId = masters[LOCATION_MASTER_TYPES.states]?._id;
          if (stateMasterId) await updateMasterValues(stateMasterId, nextStates);
          showToast(`Imported ${legacyStates.length} states into the "India" group`, "success");
        }
      }
      if (nextCountries.length === 0 && Object.keys(nextStates).length > 0) {
        nextCountries = Object.keys(nextStates);
      }

      setCountries(nextCountries);
      setStatesByCountry(nextStates);
      setCitiesByState(nextCities);
      setPincodesByCity(nextPincodes);
      setSelectedCountry((prev) => (prev && nextStates[prev] ? prev : nextCountries[0] ?? null));
      setSelectedState(null);
      setSelectedCity(null);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Unable to load location masters."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  // ── Persist helper ────────────────────────────────────────────────────────
  const persist = async (type: string, values: MasterValues) => {
    const id = masterIds[type];
    if (!id) throw new Error("Location master not loaded yet.");
    await updateMasterValues(id, values);
  };

  // ── Derived lists ─────────────────────────────────────────────────────────
  const states = selectedCountry ? statesByCountry[selectedCountry] ?? [] : [];
  const cities = selectedState ? citiesByState[selectedState] ?? [] : [];
  const pincodes = selectedCity ? pincodesByCity[selectedCity] ?? [] : [];

  const totals = useMemo(
    () => ({
      countries: countries.length,
      states: Object.values(statesByCountry).reduce((n, l) => n + l.length, 0),
      cities: Object.values(citiesByState).reduce((n, l) => n + l.length, 0),
      pincodes: Object.values(pincodesByCity).reduce((n, l) => n + l.length, 0),
    }),
    [countries, statesByCountry, citiesByState, pincodesByCity]
  );

  // ── Country actions ───────────────────────────────────────────────────────
  const addCountry = async (name: string) => {
    if (hasValue(countries, name)) throw new Error(`"${name}" already exists`);
    const next = [...countries, name];
    await persist(LOCATION_MASTER_TYPES.countries, next);
    setCountries(next);
    setSelectedCountry((prev) => prev ?? name);
    showToast(`Country "${name}" added`, "success");
  };

  const deleteCountry = async (name: string) => {
    const next = countries.filter((c) => c !== name);
    // Drop this country's group too, otherwise a re-added country with the same
    // name would resurrect its old states on next reload.
    const nextStates = { ...statesByCountry };
    const stateKey = findKey(nextStates, name);
    if (stateKey) delete nextStates[stateKey];
    await Promise.all([
      persist(LOCATION_MASTER_TYPES.countries, next),
      stateKey ? persist(LOCATION_MASTER_TYPES.states, nextStates) : Promise.resolve(),
    ]);
    setCountries(next);
    if (stateKey) setStatesByCountry(nextStates);
    if (selectedCountry === name) {
      setSelectedCountry(next[0] ?? null);
      setSelectedState(null);
      setSelectedCity(null);
    }
    showToast(`Country "${name}" removed`, "success");
  };

  // ── State actions ─────────────────────────────────────────────────────────
  const addState = async (name: string) => {
    if (!selectedCountry) throw new Error("Select a country first");
    const current = statesByCountry[selectedCountry] ?? [];
    if (hasValue(current, name)) throw new Error(`"${name}" already exists`);
    const next = { ...statesByCountry, [selectedCountry]: [...current, name] };
    await persist(LOCATION_MASTER_TYPES.states, next);
    setStatesByCountry(next);
    setSelectedState((prev) => prev ?? name);
    showToast(`State "${name}" added to ${selectedCountry}`, "success");
  };

  const deleteState = async (name: string) => {
    if (!selectedCountry) return;
    const next = {
      ...statesByCountry,
      [selectedCountry]: (statesByCountry[selectedCountry] ?? []).filter((s) => s !== name),
    };
    await persist(LOCATION_MASTER_TYPES.states, next);
    setStatesByCountry(next);
    if (selectedState === name) { setSelectedState(null); setSelectedCity(null); }
    showToast(`State "${name}" removed`, "success");
  };

  // ── City actions ──────────────────────────────────────────────────────────
  const addCity = async (name: string) => {
    if (!selectedState) throw new Error("Select a state first");
    const current = citiesByState[selectedState] ?? [];
    if (hasValue(current, name)) throw new Error(`"${name}" already exists`);
    const next = { ...citiesByState, [selectedState]: [...current, name] };
    await persist(LOCATION_MASTER_TYPES.cities, next);
    setCitiesByState(next);
    setSelectedCity((prev) => prev ?? name);
    showToast(`City "${name}" added to ${selectedState}`, "success");
  };

  const renameCity = async (oldName: string, newName: string) => {
    if (!selectedState) return;
    const current = citiesByState[selectedState] ?? [];
    if (hasValue(current, newName)) throw new Error(`"${newName}" already exists`);
    const nextCities = {
      ...citiesByState,
      [selectedState]: current.map((c) => (c === oldName ? newName : c)),
    };
    // Pincodes are keyed by city name — move them across with the rename.
    const nextPincodes = { ...pincodesByCity };
    const oldKey = findKey(nextPincodes, oldName);
    if (oldKey) {
      nextPincodes[newName] = nextPincodes[oldKey];
      delete nextPincodes[oldKey];
    }
    await Promise.all([
      persist(LOCATION_MASTER_TYPES.cities, nextCities),
      persist(LOCATION_MASTER_TYPES.pincodes, nextPincodes),
    ]);
    setCitiesByState(nextCities);
    setPincodesByCity(nextPincodes);
    if (selectedCity === oldName) setSelectedCity(newName);
    showToast(`Renamed to "${newName}"`, "success");
  };

  const deleteCity = async (name: string) => {
    if (!selectedState) return;
    const nextCities = {
      ...citiesByState,
      [selectedState]: (citiesByState[selectedState] ?? []).filter((c) => c !== name),
    };
    const nextPincodes = { ...pincodesByCity };
    const cityKey = findKey(nextPincodes, name);
    if (cityKey) delete nextPincodes[cityKey];
    await Promise.all([
      persist(LOCATION_MASTER_TYPES.cities, nextCities),
      persist(LOCATION_MASTER_TYPES.pincodes, nextPincodes),
    ]);
    setCitiesByState(nextCities);
    setPincodesByCity(nextPincodes);
    if (selectedCity === name) setSelectedCity(null);
    showToast(`City "${name}" removed`, "success");
  };

  // ── Pincode actions ───────────────────────────────────────────────────────
  const addPincode = async (value: string) => {
    if (!selectedCity) throw new Error("Select a city first");
    const current = pincodesByCity[selectedCity] ?? [];
    if (hasValue(current, value)) throw new Error(`"${value}" already exists`);
    const next = { ...pincodesByCity, [selectedCity]: [...current, value] };
    await persist(LOCATION_MASTER_TYPES.pincodes, next);
    setPincodesByCity(next);
  };

  const deletePincode = async (value: string) => {
    if (!selectedCity) return;
    const next = {
      ...pincodesByCity,
      [selectedCity]: (pincodesByCity[selectedCity] ?? []).filter((p) => p !== value),
    };
    await persist(LOCATION_MASTER_TYPES.pincodes, next);
    setPincodesByCity(next);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ background: activeBg }}
          >
            <Globe size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "rgb(0, 102, 153)" }}>
              Country, State &amp; City
            </h2>
            <p className="text-sm text-slate-500">
              Manage the Country → State → City → Pincode cascade used in loan forms.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "Countries", value: totals.countries },
            { label: "States", value: totals.states },
            { label: "Cities", value: totals.cities },
            { label: "Pincodes", value: totals.pincodes },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 shadow-sm"
            >
              <span className="font-semibold text-slate-700 tabular-nums">{value}</span> {label}
            </div>
          ))}
        </div>
      </div>

      {loadError ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center gap-3 py-16 px-6 text-center">
          <p className="text-sm text-red-600">{loadError}</p>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md border border-slate-300 hover:bg-slate-50 transition"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {shapeNotice.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-2.5 text-sm text-amber-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <p>
                <span className="font-semibold">
                  {shapeNotice.join(", ")}
                </span>{" "}
                {shapeNotice.length === 1 ? "is" : "are"} stored as a flat list by the
                backend, so grouped values cannot be saved yet. Ask the backend to store
                {shapeNotice.length === 1 ? " this master" : " these masters"} as an object
                (or recreate {shapeNotice.length === 1 ? "it" : "them"} with an empty object
                value) — then Country → State → City → Pincode editing works end to end.
              </p>
            </div>
          )}

          {/* ── Countries ── */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-200 bg-slate-50">
              <Globe size={14} className="text-[rgb(0,102,153)]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[rgb(0,102,153)]">
                Countries
              </span>
              <span className="ml-auto text-xs text-slate-400">
                {countries.length} {countries.length === 1 ? "country" : "countries"}
              </span>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                {loading ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-9 w-28 rounded-full bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : countries.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-6">
                    No countries yet. Add the first one — usually “India”.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {countries.map((country) => {
                      const isSelected = selectedCountry === country;
                      const count = (statesByCountry[country] ?? []).length;
                      return (
                        <div
                          key={country}
                          onClick={() => {
                            setSelectedCountry(country);
                            setSelectedState(null);
                            setSelectedCity(null);
                          }}
                          className={`group flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-full border cursor-pointer transition ${
                            isSelected
                              ? "border-transparent text-white shadow-sm"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                          style={isSelected ? { background: activeBg } : undefined}
                        >
                          <span className="text-sm font-medium">{country}</span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              isSelected ? "bg-white/20" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try { await deleteCountry(country); }
                              catch (err) { showToast(getApiErrorMessage(err, "Unable to delete country."), "error"); }
                            }}
                            aria-label={`Delete ${country}`}
                            className={`p-1 rounded-full transition ${
                              isSelected
                                ? "text-white/70 hover:text-white hover:bg-white/20"
                                : "text-slate-300 hover:text-red-600 hover:bg-red-50"
                            }`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="lg:col-span-1">
                <AddValueForm
                  onAdd={addCountry}
                  placeholder="e.g. India"
                  bulkPlaceholder={"India\nUnited Arab Emirates\nSingapore"}
                  allowBulk
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* ── State → City → Pincode cascade ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <LevelPane
              title="States"
              subtitle={selectedCountry ? `${states.length} in ${selectedCountry}` : undefined}
              icon={MapPin}
              items={states}
              selected={selectedState}
              onSelect={(state) => { setSelectedState(state); setSelectedCity(null); }}
              onAdd={addState}
              onDelete={deleteState}
              addPlaceholder="e.g. Maharashtra"
              bulkPlaceholder={"Maharashtra\nKarnataka\nGujarat"}
              allowBulk
              emptyHint={selectedCountry ? `No states for ${selectedCountry} yet.` : "Select a country first."}
              disabledHint={!selectedCountry}
              disabledMessage="Pick a country above to manage its states."
              loading={loading}
            />

            <LevelPane
              title="Cities"
              subtitle={selectedState ? `${cities.length} in ${selectedState}` : undefined}
              icon={Building2}
              items={cities}
              selected={selectedCity}
              onSelect={setSelectedCity}
              onAdd={addCity}
              onDelete={deleteCity}
              onRename={renameCity}
              addPlaceholder="e.g. Mumbai"
              bulkPlaceholder={"Mumbai\nPune\nNagpur"}
              allowBulk
              emptyHint={selectedState ? `No cities for ${selectedState} yet.` : "Select a state first."}
              disabledHint={!selectedState}
              disabledMessage="Pick a state to manage its cities."
              loading={loading}
            />

            <LevelPane
              title="Pincodes"
              subtitle={selectedCity ? `${pincodes.length} for ${selectedCity}` : undefined}
              icon={Hash}
              items={pincodes}
              onAdd={addPincode}
              onDelete={deletePincode}
              addPlaceholder="e.g. 400001"
              bulkPlaceholder={"400001\n400002\n400003\n\nor: 400001, 400002"}
              allowBulk
              validate={validatePincode}
              emptyHint={selectedCity ? `No pincodes for ${selectedCity} yet.` : "Select a city first."}
              disabledHint={!selectedCity}
              disabledMessage="Pick a city to manage its pincodes."
              loading={loading}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default LocationsManager;
