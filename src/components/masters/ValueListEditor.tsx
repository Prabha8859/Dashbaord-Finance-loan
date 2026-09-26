import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { isEmptyItem, normalizeKey } from "../../utils/masterValidation";

interface ValueListEditorProps {
  values: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  numeric?: boolean;
  disabled?: boolean;
  /** Fires whenever the current list becomes valid/invalid (empty/duplicate rows). */
  onValidityChange?: (valid: boolean) => void;
}

const ValueListEditor = ({
  values,
  onChange,
  numeric = false,
  disabled = false,
  onValidityChange,
}: ValueListEditorProps) => {
  const [draft, setDraft] = useState("");
  const [addError, setAddError] = useState("");

  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    values.forEach((v) => {
      const key = normalizeKey(v);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  }, [values]);

  const rowErrors = useMemo(
    () =>
      values.map((v) => {
        if (isEmptyItem(v)) return "Cannot be empty";
        if (duplicateKeys.has(normalizeKey(v))) return "Duplicate value";
        return "";
      }),
    [values, duplicateKeys]
  );

  const isValid = useMemo(() => rowErrors.every((e) => !e), [rowErrors]);

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const handleRowChange = (index: number, raw: string) => {
    const next = [...values];
    if (numeric) {
      next[index] = raw === "" ? "" : Number(raw);
    } else {
      next[index] = raw;
    }
    onChange(next);
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const commitAdd = () => {
    const raw = draft.trim();
    if (!raw) {
      setAddError("Enter a value first");
      return;
    }
    const candidate: string | number = numeric ? Number(raw) : raw;
    if (numeric && !Number.isFinite(candidate)) {
      setAddError("Enter a valid number");
      return;
    }
    const key = normalizeKey(candidate);
    if (values.some((v) => normalizeKey(v) === key)) {
      setAddError(`"${raw}" already exists`);
      return;
    }

    // Keep a trailing "Other" pinned as the last option — insert new values before it.
    const otherIndex = values.findIndex(
      (v) => typeof v === "string" && v.trim().toLowerCase() === "other"
    );
    const next =
      otherIndex === -1
        ? [...values, candidate]
        : [...values.slice(0, otherIndex), candidate, ...values.slice(otherIndex)];

    onChange(next);
    setDraft("");
    setAddError("");
  };

  const handleAddKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitAdd();
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type={numeric ? "number" : "text"}
          value={draft}
          disabled={disabled}
          onChange={(e) => {
            setDraft(e.target.value);
            if (addError) setAddError("");
          }}
          onKeyDown={handleAddKeyDown}
          placeholder={numeric ? "Add a number..." : "Add a value..."}
          className={`flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] disabled:bg-slate-50 disabled:text-slate-400 ${
            addError ? "border-red-400" : "border-slate-300"
          }`}
        />
        <button
          type="button"
          onClick={commitAdd}
          disabled={disabled}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white shrink-0 disabled:opacity-50 hover:brightness-110 transition"
          style={{ background: "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))" }}
        >
          <Plus size={16} />
          Add
        </button>
      </div>
      {addError && <p className="text-xs text-red-600 -mt-3 mb-3">{addError}</p>}

      {values.length === 0 ? (
        <p className="text-sm text-slate-400 italic py-6 text-center border border-dashed border-slate-200 rounded-lg">
          No values yet. Add the first one above.
        </p>
      ) : (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
          {values.map((v, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2">
              <span className="text-xs text-slate-400 w-6 text-right shrink-0 tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <input
                  type={numeric ? "number" : "text"}
                  value={v}
                  disabled={disabled}
                  onChange={(e) => handleRowChange(i, e.target.value)}
                  className={`w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] disabled:bg-slate-50 disabled:text-slate-400 ${
                    rowErrors[i] ? "border-red-400 bg-red-50" : "border-slate-200"
                  }`}
                />
                {rowErrors[i] && (
                  <p className="text-[11px] text-red-600 mt-0.5">{rowErrors[i]}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                disabled={disabled}
                aria-label={`Remove item ${i + 1}`}
                className="shrink-0 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-2">
        {values.length} {values.length === 1 ? "value" : "values"}
      </p>
    </div>
  );
};

export default ValueListEditor;
