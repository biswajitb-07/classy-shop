import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  FiEdit3,
  FiLock,
  FiShield,
  FiTrash2,
  FiUnlock,
  FiUsers,
} from "react-icons/fi";
import {
  useCreateAdminMutation,
  useDeleteAdminByIdMutation,
  useGetAdminsQuery,
  useToggleAdminBlockMutation,
  useUpdateAdminByIdMutation,
} from "../../../../features/api/authApi";
import AuthButtonLoader from "../../../../component/Loader/AuthButtonLoader";
import PageLoader from "../../../../component/Loader/PageLoader";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  bio: "",
};

const emptyCreateForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  bio: "",
};

const Admins = () => {
  const { data, isLoading, error, refetch } = useGetAdminsQuery();
  const [createAdmin, { isLoading: isCreating }] = useCreateAdminMutation();
  const [updateAdmin, { isLoading: isSaving }] = useUpdateAdminByIdMutation();
  const [deleteAdmin, { isLoading: isDeleting }] = useDeleteAdminByIdMutation();
  const [toggleAdminBlock, { isLoading: isToggling }] =
    useToggleAdminBlockMutation();

  const [editingAdmin, setEditingAdmin] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingAdminId, setTogglingAdminId] = useState(null);

  useEffect(() => {
    if (editingAdmin) {
      setForm({
        name: editingAdmin.name || "",
        email: editingAdmin.email || "",
        phone: editingAdmin.phone ?? "",
        bio: editingAdmin.bio || "",
      });
    }
  }, [editingAdmin]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <PageLoader message={null} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center font-semibold text-red-500">
        Failed to load admins.
      </div>
    );
  }

  const admins = data?.admins || [];

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await createAdmin({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        phone: createForm.phone.trim(),
        bio: createForm.bio.trim(),
      }).unwrap();
      toast.success("Admin created successfully");
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create admin");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateAdmin({
        id: editingAdmin._id,
        ...form,
      }).unwrap();
      toast.success("Admin updated successfully");
      setEditingAdmin(null);
      setForm(emptyForm);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update admin");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAdmin(deleteTarget._id).unwrap();
      toast.success("Admin deleted successfully");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete admin");
    }
  };

  const handleBlockToggle = async (admin) => {
    try {
      setTogglingAdminId(admin._id);
      await toggleAdminBlock({
        id: admin._id,
        isBlocked: !admin.isBlocked,
      }).unwrap();
      toast.success(
        admin.isBlocked
          ? "Admin unblocked successfully"
          : "Admin blocked successfully"
      );
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update admin status");
    } finally {
      setTogglingAdminId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto mt-4 max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
              <FiShield size={14} /> Governance
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Admin Accounts
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Create and manage dedicated admin accounts separately from vendors and users.
            </p>
          </div>
          <div className="rounded-[20px] border border-slate-100 bg-white px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Total Admins
            </p>
            <p className="mt-1 text-2xl font-black leading-none text-slate-900">
              {admins.length}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            to="/community/admins"
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
          >
            <FiShield size={16} /> Admin Accounts
          </Link>
          <Link
            to="/community/users"
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-600 transition hover:bg-sky-50"
          >
            <FiUsers size={16} /> User Data
          </Link>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
          >
            <FiShield size={16} /> Create Admin
          </button>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-5 font-bold">Admin</th>
                  <th className="px-6 py-5 font-bold">Email</th>
                  <th className="px-6 py-5 font-bold">Phone</th>
                  <th className="px-6 py-5 font-bold">Status</th>
                  <th className="px-6 py-5 font-bold">Joined</th>
                  <th className="px-6 py-5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.length > 0 ? (
                  admins.map((admin) => (
                    <tr key={admin._id} className="group transition-color">
                      <td className="border-l-[3px] border-transparent px-6 py-5 font-semibold text-slate-900 group-hover:border-violet-400">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm font-bold text-violet-600">
                            {admin.photoUrl ? (
                              <img
                                src={admin.photoUrl}
                                alt="admin"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (admin.name || "A").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{admin.name || "Unnamed"}</p>
                            <p className="text-xs text-slate-500">
                              {admin.bio?.slice(0, 58) || "No bio available"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-medium">{admin.email}</td>
                      <td className="px-6 py-5 font-medium text-slate-700">
                        {admin.phone || "-"}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            admin.isBlocked
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {admin.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap font-medium text-slate-500">
                        {new Date(admin.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingAdmin(admin)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                          >
                            <FiEdit3 size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(admin)}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                          >
                            <FiTrash2 size={14} /> Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBlockToggle(admin)}
                            disabled={isToggling && togglingAdminId === admin._id}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition ${
                              admin.isBlocked
                                ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                : "border-amber-200 text-amber-700 hover:bg-amber-50"
                            }`}
                          >
                            {isToggling && togglingAdminId === admin._id ? (
                              <AuthButtonLoader />
                            ) : admin.isBlocked ? (
                              <>
                                <FiUnlock size={14} /> Unblock
                              </>
                            ) : (
                              <>
                                <FiLock size={14} /> Block
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      No admin accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <h2 className="text-2xl font-black text-slate-950">Create Admin Account</h2>
            <p className="mt-2 text-sm text-slate-500">
              Add a new admin with a dedicated platform login.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleCreateAdmin}>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" placeholder="Admin name" value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} required />
                <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" type="email" placeholder="Admin email" value={createForm.email} onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))} required />
                <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" type="password" placeholder="Password" value={createForm.password} onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))} required />
                <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" placeholder="Phone number" value={createForm.phone} onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <textarea className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" placeholder="Short bio" value={createForm.bio} onChange={(e) => setCreateForm((prev) => ({ ...prev, bio: e.target.value }))} />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-70">
                  {isCreating ? "Creating..." : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <h2 className="text-2xl font-black text-slate-950">Edit Admin Account</h2>
            <form className="mt-6 space-y-4" onSubmit={handleSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" placeholder="Admin name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
                <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" type="email" placeholder="Admin email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
                <input className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" placeholder="Phone number" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <textarea className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" placeholder="Short bio" value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditingAdmin(null)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-70">
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <h2 className="text-xl font-black text-slate-950">Delete Admin Account</h2>
            <p className="mt-3 text-sm text-slate-500">
              This will permanently remove <span className="font-semibold text-slate-800">{deleteTarget.name}</span>.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={isDeleting} className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-70">
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admins;
