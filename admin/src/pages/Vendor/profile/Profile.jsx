import { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiCamera,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSave,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import {
  useChangePasswordMutation,
  useLoadUserQuery,
  useUpdateUserProfileMutation,
} from "../../../features/api/authApi";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import { useTheme } from "../../../context/ThemeContext";

const fieldClass = (isDark) =>
  `mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    isDark
      ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-sky-500"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-sky-500"
  }`;

const InfoCard = ({ icon: Icon, label, value, dark = false }) => (
  <div
    className={`rounded-[24px] border p-4 ${
      dark
        ? "border-slate-700 bg-slate-900/80"
        : "border-slate-200 bg-white/90 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
    }`}
  >
    <div className="flex items-start gap-3">
      <div
        className={`rounded-2xl p-3 ${
          dark ? "bg-slate-800 text-sky-300" : "bg-sky-50 text-sky-600"
        }`}
      >
        <Icon className="text-lg" />
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? "text-slate-500" : "text-slate-500"}`}>
          {label}
        </p>
        <p className={`mt-2 break-words text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
          {value || "Not provided"}
        </p>
      </div>
    </div>
  </div>
);

const Profile = () => {
  const { isDark } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [changeModal, setChangeModal] = useState(false);
  const [changeForm, setChangeForm] = useState({
    currentPassword: "",
    newPassword: "",
    showCurrent: false,
    showNew: false,
  });

  const { data, isLoading: isUserLoading, refetch } = useLoadUserQuery();
  const [updateUser, { isLoading: updateIsLoading }] =
    useUpdateUserProfileMutation();
  const [changePwd, { isLoading: changeLoading }] = useChangePasswordMutation();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    photoUrl: "",
    bio: "",
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
    },
  });

  useEffect(() => {
    if (data?.vendor) {
      const vendor = data.vendor;
      const defaultAddress =
        vendor.addresses?.find((addr) => addr.isDefault) ||
        vendor.addresses?.[0] ||
        {};

      setProfile({
        name: vendor.name || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        dob: vendor.dob ? String(vendor.dob).slice(0, 10) : "",
        photoUrl: vendor.photoUrl || "",
        bio: vendor.bio || "",
        address: {
          street: defaultAddress.street || "",
          city: defaultAddress.city || "",
          state: defaultAddress.state || "",
          postalCode: defaultAddress.postalCode || "",
          country: defaultAddress.country || "India",
        },
      });
    }
  }, [data]);

  const profileStats = useMemo(
    () => [
      {
        label: "Email",
        value: profile.email || "No email",
      },
      {
        label: "Phone",
        value: profile.phone || "No phone",
      },
      {
        label: "Country",
        value: profile.address.country || "India",
      },
    ],
    [profile.address.country, profile.email, profile.phone]
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      address: { ...prev.address, [name]: value },
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10 MB");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () =>
      setProfile((prev) => ({ ...prev, photoUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveChanges = async () => {
    if (!profile.name || !profile.email) {
      toast.error("Name and email are required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", profile.name);
      formData.append("email", profile.email);
      formData.append("phone", profile.phone || "");
      formData.append("dob", profile.dob || "");
      formData.append("bio", profile.bio || "");
      formData.append(
        "addresses",
        JSON.stringify([
          {
            type: "home",
            street: profile.address.street,
            city: profile.address.city,
            state: profile.address.state,
            postalCode: profile.address.postalCode,
            country: profile.address.country,
            isDefault: true,
          },
        ])
      );

      if (selectedFile) {
        formData.append("photo", selectedFile);
      }

      const res = await updateUser(formData).unwrap();
      toast.success(res.message || "Profile updated");
      setIsEditing(false);
      setSelectedFile(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Update failed");
    }
  };

  const toggleEdit = () => {
    if (isEditing && data?.vendor) {
      const vendor = data.vendor;
      const defaultAddress =
        vendor.addresses?.find((addr) => addr.isDefault) ||
        vendor.addresses?.[0] ||
        {};

      setProfile({
        name: vendor.name || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        dob: vendor.dob ? String(vendor.dob).slice(0, 10) : "",
        photoUrl: vendor.photoUrl || "",
        bio: vendor.bio || "",
        address: {
          street: defaultAddress.street || "",
          city: defaultAddress.city || "",
          state: defaultAddress.state || "",
          postalCode: defaultAddress.postalCode || "",
          country: defaultAddress.country || "India",
        },
      });
      setSelectedFile(null);
    }

    setIsEditing((current) => !current);
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    try {
      await changePwd({
        currentPassword: changeForm.currentPassword,
        newPassword: changeForm.newPassword,
      }).unwrap();
      toast.success("Password changed successfully");
      setChangeModal(false);
      setChangeForm({
        currentPassword: "",
        newPassword: "",
        showCurrent: false,
        showNew: false,
      });
    } catch (err) {
      toast.error(err?.data?.message || "Failed to change password");
    }
  };

  if (isUserLoading) return <ProfileSkeleton dark={isDark} />;

  return (
    <div
      className={`min-h-screen px-4 py-5 md:px-6 ${
        isDark
          ? "bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#111827_100%)]"
          : "bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_48%,#ffffff_100%)]"
      }`}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section
          className={`overflow-hidden rounded-[34px] border p-6 md:p-8 ${
            isDark
              ? "border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_28%),linear-gradient(135deg,#050816_0%,#0f172a_48%,#111827_100%)] text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
              : "border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_26%),linear-gradient(135deg,#ffffff_0%,#eef4ff_58%,#f8fafc_100%)] text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
          }`}
        >
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${isDark ? "text-slate-400" : "text-slate-500"} backdrop-blur`}>
                <FiShield className="text-sky-300" />
                Vendor identity hub
              </div>
              <div>
                <p
                  className={`text-sm font-semibold uppercase tracking-[0.2em] ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Profile command center
                </p>
                <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                  {profile.name || "Vendor"}
                </h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {profileStats.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[22px] border px-4 py-4 ${
                      isDark
                        ? "border-white/10 bg-white/5"
                        : "border-slate-200 bg-white/85"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="mt-3 text-sm font-bold">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={toggleEdit}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                    isEditing
                      ? "bg-rose-500 text-white hover:bg-rose-600"
                      : "bg-[linear-gradient(135deg,#38bdf8_0%,#6366f1_55%,#8b5cf6_100%)] text-white shadow-[0_16px_40px_rgba(99,102,241,0.28)]"
                  }`}
                >
                  <FiEdit2 />
                  {isEditing ? "Cancel edit" : "Edit profile"}
                </button>
                <button
                  type="button"
                  onClick={() => setChangeModal(true)}
                  className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition ${
                    isDark
                      ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                      : "border-slate-200 bg-white/80 text-slate-900 hover:bg-white"
                  }`}
                >
                  <FiShield />
                  Change password
                </button>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={updateIsLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {updateIsLoading ? <AuthButtonLoader /> : <FiSave />}
                    {updateIsLoading ? "Saving..." : "Save changes"}
                  </button>
                ) : null}
              </div>
            </div>

            <div
              className={`rounded-[30px] border p-6 backdrop-blur ${
                isDark
                  ? "border-white/10 bg-slate-950/60"
                  : "border-white/70 bg-white/78"
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="h-28 w-28 overflow-hidden rounded-[30px] border-4 border-white/20 shadow-2xl md:h-32 md:w-32">
                    {profile.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt={profile.name || "Vendor"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 to-violet-500 text-4xl font-black text-white">
                        {(profile.name || "V").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <label className="absolute -right-2 -bottom-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-white text-slate-900 shadow-xl">
                      <FiCamera className="text-lg" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  ) : null}
                </div>

                <h2 className="mt-5 text-2xl font-black">
                  {profile.name || "Vendor"}
                </h2>
                <p
                  className={`mt-2 max-w-sm text-sm leading-6 ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {profile.bio || "Add your store story so buyers can trust your brand faster."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div
            className={`rounded-[30px] border p-6 ${
              isDark
                ? "border-slate-700 bg-slate-900/80"
                : "border-slate-200 bg-white/90 shadow-[0_16px_48px_rgba(15,23,42,0.06)]"
            }`}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3
                  className={`text-xl font-black ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Seller Information
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Update your visible identity and core account information.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={profile.name}
                    onChange={handleInputChange}
                    className={fieldClass(isDark)}
                  />
                ) : (
                  <div className={fieldClass(isDark)}>{profile.name || "Not provided"}</div>
                )}
              </div>

              <div>
                <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    className={fieldClass(isDark)}
                  />
                ) : (
                  <div className={fieldClass(isDark)}>{profile.email || "Not provided"}</div>
                )}
              </div>

              <div>
                <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    onChange={handleInputChange}
                    className={fieldClass(isDark)}
                  />
                ) : (
                  <div className={fieldClass(isDark)}>{profile.phone || "Not provided"}</div>
                )}
              </div>

              <div>
                <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  Date of Birth
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    name="dob"
                    value={profile.dob}
                    onChange={handleInputChange}
                    className={fieldClass(isDark)}
                  />
                ) : (
                  <div className={fieldClass(isDark)}>
                    {profile.dob
                      ? new Date(profile.dob).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not provided"}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Bio
              </label>
              {isEditing ? (
                <textarea
                  name="bio"
                  value={profile.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className={`${fieldClass(isDark)} resize-none`}
                  placeholder="Tell buyers about your store..."
                />
              ) : (
                <div className={`${fieldClass(isDark)} min-h-[7rem] leading-7`}>
                  {profile.bio || "No bio provided"}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <InfoCard
              dark={isDark}
              icon={FiMail}
              label="Primary Email"
              value={profile.email}
            />
            <InfoCard
              dark={isDark}
              icon={FiPhone}
              label="Contact Number"
              value={profile.phone}
            />
            <InfoCard
              dark={isDark}
              icon={FiCalendar}
              label="Date of Birth"
              value={
                profile.dob
                  ? new Date(profile.dob).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : ""
              }
            />
            <div
              className={`rounded-[24px] border p-5 ${
                isDark
                  ? "border-slate-700 bg-slate-900/80"
                  : "border-slate-200 bg-white/90 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
              }`}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`rounded-2xl p-3 ${
                    isDark ? "bg-slate-800 text-sky-300" : "bg-sky-50 text-sky-600"
                  }`}
                >
                  <FiMapPin className="text-lg" />
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    Address
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Primary location
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {["street", "city", "state", "postalCode", "country"].map((field) => (
                  <div key={field}>
                    <label className={`text-xs font-semibold uppercase tracking-[0.15em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                      {field}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name={field}
                        value={profile.address[field]}
                        onChange={handleAddressChange}
                        className={fieldClass(isDark)}
                      />
                    ) : (
                      <div className={fieldClass(isDark)}>
                        {profile.address[field] || "Not provided"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {changeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <form
            onSubmit={handleChangePwd}
            className={`w-full max-w-md rounded-[30px] border p-6 shadow-2xl ${
              isDark
                ? "border-slate-700 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <h2 className="text-2xl font-black">Change Password</h2>
            <p
              className={`mt-2 text-sm ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Keep your vendor account secure with a fresh password.
            </p>

            <div className="mt-6 space-y-4">
              <div className="relative">
                <input
                  type={changeForm.showCurrent ? "text" : "password"}
                  placeholder="Current password"
                  value={changeForm.currentPassword}
                  onChange={(e) =>
                    setChangeForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  className={`${fieldClass(isDark)} pr-12`}
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setChangeForm((prev) => ({
                      ...prev,
                      showCurrent: !prev.showCurrent,
                    }))
                  }
                  className={`absolute inset-y-0 right-0 px-4 ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {changeForm.showCurrent ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={changeForm.showNew ? "text" : "password"}
                  placeholder="New password"
                  value={changeForm.newPassword}
                  onChange={(e) =>
                    setChangeForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className={`${fieldClass(isDark)} pr-12`}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setChangeForm((prev) => ({
                      ...prev,
                      showNew: !prev.showNew,
                    }))
                  }
                  className={`absolute inset-y-0 right-0 px-4 ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {changeForm.showNew ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={changeLoading}
                className="flex-1 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                {changeLoading ? <AuthButtonLoader /> : "Update password"}
              </button>
              <button
                type="button"
                onClick={() => setChangeModal(false)}
                className={`flex-1 rounded-full border px-5 py-3 text-sm font-semibold ${
                  isDark
                    ? "border-slate-700 bg-slate-900 text-slate-200"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default Profile;

const ProfileSkeleton = ({ dark = false }) => (
  <div
    className={`min-h-screen px-4 py-5 md:px-6 ${
      dark
        ? "bg-[linear-gradient(180deg,#020617_0%,#0f172a_50%,#111827_100%)]"
        : "bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_50%,#ffffff_100%)]"
    }`}
  >
    <div className="mx-auto max-w-7xl animate-pulse space-y-6">
      <div
        className={`h-72 rounded-[34px] ${
          dark ? "bg-slate-900/80" : "bg-white/90"
        }`}
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div
          className={`h-[30rem] rounded-[30px] ${
            dark ? "bg-slate-900/80" : "bg-white/90"
          }`}
        />
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`h-32 rounded-[24px] ${
                dark ? "bg-slate-900/80" : "bg-white/90"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);
