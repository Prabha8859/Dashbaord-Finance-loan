import { useState, type FormEvent } from "react";
import { KeyRound, Mail, Shield, User } from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { changeAdminPassword, updateAdminProfile } from "../api/auth";
import { getApiErrorMessage } from "../utils/apiError";

const activeBg = "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))";
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const EMAIL_REGEX    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getInitials = (name?: string) => {
  if (!name) return "A";
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
};

// ── Profile info card ─────────────────────────────────────────────────────────
const ProfileCard = () => {
  const { admin, updateAdmin } = useAuth();
  const { showToast } = useToast();

  const [name,  setName]  = useState(admin?.name  ?? "");
  const [email, setEmail] = useState(admin?.email ?? "");
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirty = name.trim() !== (admin?.name ?? "") || email.trim() !== (admin?.email ?? "");

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    else if (name.trim().length > 100) next.name = "Max 100 characters";
    if (!email.trim()) next.email = "Email is required";
    else if (!EMAIL_REGEX.test(email.trim())) next.email = "Enter a valid email";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const updated = await updateAdminProfile({ name: name.trim(), email: email.trim() });
      updateAdmin(updated);
      showToast("Profile updated", "success");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Unable to update profile."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <User size={15} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">Profile Information</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] transition ${errors.name ? "border-red-400" : "border-slate-300"}`}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] transition ${errors.email ? "border-red-400" : "border-slate-300"}`}
          />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <Shield size={14} className="text-slate-400" />
            <span className="text-sm text-slate-600 capitalize">{admin?.role}</span>
          </div>
        </div>
        <div className="pt-2 flex justify-end">
          <button type="submit" disabled={isSubmitting || !isDirty}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
            style={{ background: activeBg }}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Change password card ──────────────────────────────────────────────────────
const ChangePasswordCard = () => {
  const { showToast } = useToast();

  const [currentPassword,  setCurrentPassword]  = useState("");
  const [newPassword,      setNewPassword]       = useState("");
  const [confirmPassword,  setConfirmPassword]   = useState("");
  const [errors,           setErrors]            = useState<Record<string, string>>({});
  const [formError,        setFormError]         = useState("");
  const [isSubmitting,     setIsSubmitting]      = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = "Current password is required";
    if (!newPassword) next.newPassword = "New password is required";
    else if (!PASSWORD_REGEX.test(newPassword))
      next.newPassword = "At least 8 characters, with a letter and a number";
    else if (newPassword === currentPassword)
      next.newPassword = "Must differ from your current password";
    if (!confirmPassword) next.confirmPassword = "Confirm your new password";
    else if (confirmPassword !== newPassword) next.confirmPassword = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await changeAdminPassword({ currentPassword, newPassword });
      showToast("Password changed successfully", "success");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setErrors({});
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Unable to change password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] transition ${errors[field] ? "border-red-400" : "border-slate-300"}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <KeyRound size={15} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">Change Password</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
            className={inputClass("currentPassword")} />
          {errors.currentPassword && <p className="text-xs text-red-600 mt-1">{errors.currentPassword}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            className={inputClass("newPassword")} />
          {errors.newPassword
            ? <p className="text-xs text-red-600 mt-1">{errors.newPassword}</p>
            : <p className="text-xs text-slate-400 mt-1">At least 8 characters, with a letter and a number.</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            className={inputClass("confirmPassword")} />
          {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
        </div>
        {formError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {formError}
          </div>
        )}
        <div className="pt-2 flex justify-end">
          <button type="submit" disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 hover:brightness-110 transition"
            style={{ background: activeBg }}>
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const Profile = () => {
  const { admin } = useAuth();

  return (
    <AdminLayout>
      {/* ── Avatar hero card ── */}
      <div
        className="rounded-xl overflow-hidden mb-6 shadow-sm"
        style={{ background: "linear-gradient(135deg, #044e74, #066a9c, #26ae90)" }}
      >
        <div className="px-8 py-8 flex items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0 border-2 border-white/30">
            {getInitials(admin?.name)}
          </div>
          {/* Info */}
          <div>
            <h2 className="text-2xl font-bold text-white">{admin?.name}</h2>
            <div className="flex items-center gap-4 mt-1.5">
              <span className="flex items-center gap-1.5 text-white/80 text-sm">
                <Mail size={13} />
                {admin?.email}
              </span>
              <span className="flex items-center gap-1.5 text-white/80 text-sm capitalize">
                <Shield size={13} />
                {admin?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two column on large screens ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <ProfileCard />
        <ChangePasswordCard />
      </div>
    </AdminLayout>
  );
};

export default Profile;
