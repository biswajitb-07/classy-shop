import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FiUsers, FiEdit3, FiTrash2, FiLock, FiUnlock } from "react-icons/fi";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import {
  useDeleteUserByIdMutation,
  useGetUsersQuery,
  useToggleUserBlockMutation,
  useUpdateUserByIdMutation,
} from "../../../../features/api/authApi";
import AuthButtonLoader from "../../../../component/Loader/AuthButtonLoader";
import PageLoader from "../../../../component/Loader/PageLoader";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  bio: "",
};

const Users = () => {
  const { data, isLoading, error, refetch } = useGetUsersQuery();
  const [updateUser, { isLoading: isSaving }] = useUpdateUserByIdMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserByIdMutation();
  const [toggleUserBlock, { isLoading: isToggling }] =
    useToggleUserBlockMutation();

  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [togglingUserId, setTogglingUserId] = useState(null);

  useEffect(() => {
    if (editingUser) {
      setForm({
        name: editingUser.name || "",
        email: editingUser.email || "",
        phone: editingUser.phone ?? "",
        bio: editingUser.bio || "",
      });
    }
  }, [editingUser]);

  if (isLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <PageLoader message={null} />
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center font-semibold text-red-500">
        Failed to load users.
      </div>
    );

  const users = data?.users || [];

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateUser({
        id: editingUser._id,
        ...form,
      }).unwrap();
      toast.success("User updated successfully");
      setEditingUser(null);
      setForm(emptyForm);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update user");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget._id).unwrap();
      toast.success("User deleted successfully");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete user");
    }
  };

  const handleBlockToggle = async (user) => {
    try {
      setTogglingUserId(user._id);
      await toggleUserBlock({
        id: user._id,
        isBlocked: !user.isBlocked,
      }).unwrap();
      toast.success(
        user.isBlocked ? "User unblocked successfully" : "User blocked successfully"
      );
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update user status");
    } finally {
      setTogglingUserId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto mt-4 max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-sky-600">
              <FiUsers size={14} /> Community
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Platform Users
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage, update, block, or delete all registered users.
            </p>
          </div>
          <div className="rounded-[20px] border border-slate-100 bg-white px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Total Users
            </p>
            <p className="mt-1 text-2xl font-black leading-none text-slate-900">
              {users.length}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            to="/community/users"
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
          >
            <FiUsers size={16} /> All Users
          </Link>
          <Link
            to="/community/vendors"
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
          >
            <HiOutlineBuildingStorefront size={16} /> Vendor Data
          </Link>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-5 font-bold">User</th>
                  <th className="px-6 py-5 font-bold">Email</th>
                  <th className="px-6 py-5 font-bold">Phone</th>
                  <th className="px-6 py-5 font-bold">Status</th>
                  <th className="px-6 py-5 font-bold">Joined</th>
                  <th className="px-6 py-5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr
                      key={user._id}
                      className="group transition-colors"
                    >
                      <td className="border-l-[3px] border-transparent px-6 py-5 font-semibold text-slate-900 group-hover:border-sky-400">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
                            {(user.name || "A").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {user.name || "Anonymous"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {user.bio?.slice(0, 48) || "No bio available"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-medium">{user.email}</td>
                      <td className="px-6 py-5 font-medium text-slate-700">
                        {user.phone || "-"}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            user.isBlocked
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {user.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap font-medium text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            disabled={isDeleting || isSaving || isToggling}
                            className="inline-flex min-w-[88px] items-center justify-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiEdit3 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            disabled={isDeleting || isSaving || isToggling}
                            className="inline-flex min-w-[96px] items-center justify-center gap-2 rounded-full bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiTrash2 size={14} /> Delete
                          </button>
                          <button
                            onClick={() => handleBlockToggle(user)}
                            disabled={isDeleting || isSaving || isToggling}
                            className={`inline-flex min-w-[108px] items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-white transition ${
                              user.isBlocked
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-amber-600 hover:bg-amber-700"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {isToggling && togglingUserId === user._id ? (
                              <AuthButtonLoader
                                size="small"
                                trackClassName="border-white/30"
                                spinnerClassName="border-white"
                              />
                            ) : user.isBlocked ? (
                              <FiUnlock size={14} />
                            ) : (
                              <FiLock size={14} />
                            )}
                            {isToggling && togglingUserId === user._id
                              ? "Loading"
                              : user.isBlocked
                              ? "Unblock"
                              : "Block"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      <FiUsers className="mx-auto mb-3 text-4xl text-slate-300" />
                      <p className="text-base font-bold text-slate-800">
                        No users found
                      </p>
                      <p className="text-sm">
                        When users register, they will appear here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600">
                  Edit User
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {editingUser.name || editingUser.email}
                </h2>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700"
              >
                Close
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Name
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Email
                  <input
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Phone
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Bio
                  <input
                    value={form.bio}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
                  />
                </label>
              </div>

            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-full bg-slate-200 px-5 py-3 text-sm font-bold text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                  {isSaving ? (
                    <AuthButtonLoader
                      size="small"
                      trackClassName="border-white/30"
                      spinnerClassName="border-white"
                    />
                  ) : null}
                  {isSaving ? "Saving" : "Save Changes"}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
              Confirm delete
            </p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">
              Delete this user?
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This will permanently remove{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget.name || deleteTarget.email}
              </span>
              .
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-full bg-slate-200 px-5 py-3 text-sm font-bold text-slate-800 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex min-w-[118px] items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? (
                  <AuthButtonLoader
                    size="small"
                    trackClassName="border-white/30"
                    spinnerClassName="border-white"
                  />
                ) : null}
                {isDeleting ? "Deleting" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
