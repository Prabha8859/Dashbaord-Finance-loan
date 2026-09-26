import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createMaster, getApiErrorMessage, type MasterDetail } from "../../api/masters";

interface NewMasterModalProps {
  onClose: () => void;
  onCreated: (master: MasterDetail) => void;
}

const TYPE_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9]*$/;

const slugifyType = (label: string) =>
  label
    .trim()
    .split(/\s+/)
    .map((w, i) =>
      i === 0
        ? w.charAt(0).toLowerCase() + w.slice(1).replace(/[^a-zA-Z0-9]/g, "")
        : w.charAt(0).toUpperCase() + w.slice(1).replace(/[^a-zA-Z0-9]/g, "")
    )
    .join("")
    .replace(/[^a-zA-Z0-9]/g, "");

const NewMasterModal = ({ onClose, onCreated }: NewMasterModalProps) => {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("");
  const [typeTouched, setTypeTouched] = useState(false);
  const [errors, setErrors] = useState<{ label?: string; type?: string }>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveType = typeTouched ? type : slugifyType(label);

  const validate = () => {
    const next: { label?: string; type?: string } = {};
    if (!label.trim()) next.label = "Label is required";
    else if (label.trim().length > 100) next.label = "Max 100 characters";

    if (!effectiveType.trim()) next.type = "Type key is required";
    else if (!TYPE_KEY_REGEX.test(effectiveType.trim()))
      next.type = "Only letters and numbers, must start with a letter";
    else if (effectiveType.trim().length > 60) next.type = "Max 60 characters";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const master = await createMaster({
        type: effectiveType.trim(),
        label: label.trim(),
        values: [],
      });
      onCreated(master);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Unable to create master. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ height: "3px", background: "linear-gradient(90deg, #066a9c, #26ae90, #f2f231)" }} />
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-base font-semibold text-slate-800">New Master</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Gold Loan Banks"
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] ${
                errors.label ? "border-red-400" : "border-slate-300"
              }`}
            />
            {errors.label && <p className="text-xs text-red-600 mt-1">{errors.label}</p>}
            <p className="text-xs text-slate-400 mt-1">Shown to admins across the panel.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type key</label>
            <input
              value={effectiveType}
              onChange={(e) => {
                setTypeTouched(true);
                setType(e.target.value);
              }}
              placeholder="e.g. goldLoanBanks"
              className={`w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] ${
                errors.type ? "border-red-400" : "border-slate-300"
              }`}
            />
            {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type}</p>}
            <p className="text-xs text-slate-400 mt-1">
              The key the app fetches this list by. Cannot be changed later.
            </p>
          </div>

          {submitError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white rounded-md transition disabled:opacity-60 hover:brightness-110"
              style={{ background: "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))" }}
            >
              {isSubmitting ? "Creating..." : "Create Master"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewMasterModal;
