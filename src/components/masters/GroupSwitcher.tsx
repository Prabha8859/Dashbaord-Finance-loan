import { useState, type KeyboardEvent } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

interface GroupSwitcherProps {
  groups: string[];
  selected: string | null;
  onSelect: (group: string) => void;
  onAddGroup: (group: string) => string | void;
  onDeleteGroup: (group: string) => void;
  disabled?: boolean;
}

const GroupSwitcher = ({
  groups,
  selected,
  onSelect,
  onAddGroup,
  onDeleteGroup,
  disabled = false,
}: GroupSwitcherProps) => {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [addError, setAddError] = useState("");

  const filtered = groups.filter((g) => g.toLowerCase().includes(search.trim().toLowerCase()));

  const commitAdd = () => {
    const name = draft.trim();
    if (!name) {
      setAddError("Enter a group name first");
      return;
    }
    const err = onAddGroup(name);
    if (err) {
      setAddError(err);
      return;
    }
    setDraft("");
    setAddError("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitAdd();
    }
  };

  return (
    <div className="w-full sm:w-56 shrink-0 flex flex-col border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-2 border-b border-slate-200 bg-slate-50">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full rounded-md border border-slate-300 pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)]"
          />
        </div>
      </div>

      <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-3 py-4 text-center">No groups found</p>
        ) : (
          filtered.map((g) => (
            <div
              key={g}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition ${
                g === selected ? "text-white" : "text-slate-700 hover:bg-slate-50"
              }`}
              style={g === selected ? { background: "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))" } : undefined}
              onClick={() => onSelect(g)}
            >
              <span className="truncate">{g}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Delete group ${g}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(g);
                }}
                className={`shrink-0 p-1 rounded transition ${
                  g === selected
                    ? "text-white/70 hover:text-white hover:bg-white/10"
                    : "text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                }`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-slate-200 bg-slate-50">
        <div className="flex gap-1.5">
          <input
            value={draft}
            disabled={disabled}
            onChange={(e) => {
              setDraft(e.target.value);
              if (addError) setAddError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="New group..."
            className={`flex-1 min-w-0 rounded-md border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] ${
              addError ? "border-red-400" : "border-slate-300"
            }`}
          />
          <button
            type="button"
            onClick={commitAdd}
            disabled={disabled}
            aria-label="Add group"
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md text-white disabled:opacity-50 hover:brightness-110 transition"
            style={{ background: "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))" }}
          >
            <Plus size={15} />
          </button>
        </div>
        {addError && <p className="text-[11px] text-red-600 mt-1">{addError}</p>}
      </div>
    </div>
  );
};

export default GroupSwitcher;
