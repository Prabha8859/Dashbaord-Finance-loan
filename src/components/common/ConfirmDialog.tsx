import { useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  /** When set, the user must type this exact text to enable the confirm button. */
  confirmText?: string;
  confirmLabel?: string;
  danger?: boolean;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  title,
  message,
  confirmText,
  confirmLabel = "Confirm",
  danger = true,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const [typed, setTyped] = useState("");
  const requiresTyping = !!confirmText;
  const canConfirm = !requiresTyping || typed.trim() === confirmText;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              danger ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
            }`}
          >
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>

        {requiresTyping && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Type <span className="font-mono font-semibold text-slate-800">{confirmText}</span> to
              confirm
            </label>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)]"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm || isSubmitting}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed ${
              danger ? "bg-red-600 hover:bg-red-700" : "hover:brightness-110"
            }`}
            style={!danger ? { background: "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))" } : undefined}
          >
            {isSubmitting ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
