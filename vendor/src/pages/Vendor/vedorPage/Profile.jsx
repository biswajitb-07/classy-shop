import { useState, useEffect } from "react";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiEdit2,
  FiCalendar,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { CgProfile } from "react-icons/cg";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  useUpdateUserProfileMutation,
  useLogoutUserMutation,
  useLoadUserQuery,
  useChangePasswordMutation,
} from "../../../features/api/authApi";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Change-password modal
  const [changeModal, setChangeModal] = useState(false);
  const [changeForm, setChangeForm] = useState({
    currentPassword: "",
    newPassword: "",
    showCurrent: false,
    showNew: false,
  });

  const navigate = useNavigate();

  const { data, isLoading: isUserLoading, error, refetch } = useLoadUserQuery();
  const [logoutUser, { isLoading: logoutIsLoading }] = useLogoutUserMutation();
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
    if (error) {
      toast.error("Failed to load user data");
      navigate("/login");
      return;
    }
    if (data?.user) {
      const user = data.user;
      const defaultAddress =
        user.addresses?.find((addr) => addr.isDefault) ||
        user.addresses?.[0] ||
        {};
      setProfile({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        dob: user.dob || "",
        photoUrl: user.photoUrl || "",
        bio: user.bio || "",
        address: {
          street: defaultAddress.street || "",
          city: defaultAddress.city || "",
          state: defaultAddress.state || "",
          postalCode: defaultAddress.postalCode || "",
          country: defaultAddress.country || "India",
        },
      });
    } else if (!isUserLoading) {
      navigate("/login");
    }
  }, [data, error, isUserLoading, navigate]);

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
      if (selectedFile) formData.append("photo", selectedFile);

      const res = await updateUser(formData).unwrap();
      toast.success(res.message || "Profile updated");
      setIsEditing(false);
      setSelectedFile(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Update failed");
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (err) {
      toast.error(err?.data?.message || "Logout failed");
    }
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setSelectedFile(null);
      setProfile((prev) => ({ ...prev, photoUrl: data?.user?.photoUrl || "" }));
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleChangePwd = async (e) => {
    e.preventDefault();
    try {
      await changePwd(changeForm).unwrap();
      toast.success("Password changed successfully");
      setChangeModal(false);
      setChangeForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error(err?.data?.message || "Failed to change password");
    }
  };

  if (isUserLoading) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-300 to-red-600 px-4 grid items-center pt-10 md:pt-0">
      <div className="container rounded-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-800 to-rose-600 drop-shadow-md">
            My Profile
          </h1>
          <p className="mt-2 text-base md:text-lg text-slate-700 font-medium tracking-wide">
            Manage your personal information
          </p>
          <div className="mt-4 mx-auto w-24 h-1 rounded-full bg-gradient-to-r from-red-500 to-amber-400 animate-pulse"></div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-all my-3">
          <div className="md:flex">
            {/* Left image div */}
            <div className="md:w-1/3 bg-gradient-to-br from-amber-300 via-red-500 to-red-700 p-6 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <pattern
                      id="p"
                      width="4"
                      height="4"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="2" cy="2" r="1" fill="white" />
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill="url(#p)" />
                </svg>
              </div>

              <div className="relative z-10 bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg w-full max-w-[400px]">
                <div className="relative group">
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-white/80 shadow-xl overflow-hidden mx-auto mb-4">
                    {profile?.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <CgProfile className="w-full h-full object-cover text-white/70" />
                    )}
                  </div>

                  {isEditing && (
                    <label className="absolute bottom-0 right-2 bg-white/90 p-2 rounded-full shadow-md text-red-600 hover:bg-red-50 cursor-pointer transition">
                      <FiEdit2 className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-white text-center drop-shadow">
                  {profile.name || "User"}
                </h2>

                <div className="mt-4 text-center text-white/90">
                  <label className="block text-xl font-bold opacity-80 text-black">
                    Bio:-
                  </label>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={profile.bio}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full bg-white/20 placeholder-white/70 text-white rounded-lg px-2 py-1 border-none focus:outline-none focus:ring-2 focus:ring-white/40 resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="mt-1 text-sm">
                      {profile.bio || "No bio provided"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right details */}
            <div className="md:w-2/3 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">
                  Personal Information
                </h3>
                <button
                  onClick={toggleEdit}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    isEditing
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <FiEdit2 className="w-4 h-4" />
                  <span>{isEditing ? "Cancel" : "Edit"}</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div className="flex items-start">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600 mr-4">
                    <FiUser className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-500">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={profile.name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-b border-gray-300 focus:border-red-500 focus:outline-none py-1"
                        required
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.name || "Not provided"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600 mr-4">
                    <FiMail className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-500">
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={profile.email}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-b border-gray-300 focus:border-red-500 focus:outline-none py-1"
                        required
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.email || "Not provided"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600 mr-4">
                    <FiPhone className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-500">
                      Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={profile.phone}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-b border-gray-300 focus:border-red-500 focus:outline-none py-1"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.phone || "Not provided"}
                      </p>
                    )}
                  </div>
                </div>

                {/* DOB */}
                <div className="flex items-start">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600 mr-4">
                    <FiCalendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-500">
                      Date of Birth
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        name="dob"
                        value={profile.dob}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-b border-gray-300 focus:border-red-500 focus:outline-none py-1"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.dob
                          ? new Date(profile.dob).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "Not provided"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600 mr-4">
                    <FiMapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-500">
                      Address
                    </label>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          name="street"
                          value={profile.address.street}
                          onChange={handleAddressChange}
                          placeholder="Street"
                          className="block w-full border-b border-gray-300 focus:border-red-500 focus:outline-none py-1"
                        />
                        <input
                          type="text"
                          name="city"
                          value={profile.address.city}
                          onChange={handleAddressChange}
                          placeholder="City"
                          className="block w-full border-b border-gray-300 focus:border-red-500 focus:outline-none py-1"
                        />
                        <input
                          type="text"
                          name="state"
                          value={profile.address.state}
                          onChange={handleAddressChange}
                          placeholder="State"
                          className="block w-full border-b border-gray-300 focus:border-red-500 focus:outline-none py-1"
                        />
                        <input
                          type="number"
                          name="postalCode"
                          value={profile.address.postalCode}
                          onChange={handleAddressChange}
                          placeholder="Postal Code"
                          className="block w-full border-b border-gray-300 focus:border-red-500 focus:outline-none py-1"
                        />
                        <input
                          type="text"
                          name="country"
                          value={profile.address.country}
                          onChange={handleAddressChange}
                          placeholder="Country"
                          className="block w-full border-b border-gray-300 focus:border-red-500 focus:outline-none py-1"
                        />
                      </div>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {profile.address.street
                          ? `${profile.address.street}, ${profile.address.city}, ${profile.address.state}, ${profile.address.postalCode}, ${profile.address.country}`
                          : "Not provided"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setChangeModal(true)}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-green-500 transition-all cursor-pointer"
                >
                  Change Password
                </button>
              </div>

              {/* Actions */}
              <div className="mt-8 flex gap-3">
                <button
                  onClick={handleLogout}
                  disabled={logoutIsLoading || updateIsLoading}
                  className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-400 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {logoutIsLoading ? <AuthButtonLoader /> : "Logout"}
                </button>
              </div>

              {/* Save while editing */}
              {isEditing && (
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleSaveChanges}
                    disabled={updateIsLoading || logoutIsLoading}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-lg shadow-md hover:from-red-600 hover:to-red-700 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {updateIsLoading ? <AuthButtonLoader /> : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CHANGE-PASSWORD MODAL */}
          {changeModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <form
                onSubmit={handleChangePwd}
                className="bg-white p-8 rounded-lg shadow-lg w-96 space-y-4"
              >
                <h2 className="text-xl font-bold text-center text-red-600">
                  Change Password
                </h2>

                {/* Current Password */}
                <div className="relative">
                  <input
                    type={changeForm.showCurrent ? "text" : "password"}
                    placeholder="Current password"
                    value={changeForm.currentPassword}
                    onChange={(e) =>
                      setChangeForm({
                        ...changeForm,
                        currentPassword: e.target.value,
                      })
                    }
                    className="w-full border px-3 py-2 rounded pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setChangeForm({
                        ...changeForm,
                        showCurrent: !changeForm.showCurrent,
                      })
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 cursor-pointer"
                  >
                    {changeForm.showCurrent ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>

                {/* New Password */}
                <div className="relative">
                  <input
                    type={changeForm.showNew ? "text" : "password"}
                    placeholder="New password"
                    value={changeForm.newPassword}
                    onChange={(e) =>
                      setChangeForm({
                        ...changeForm,
                        newPassword: e.target.value,
                      })
                    }
                    className="w-full border px-3 py-2 rounded pr-10"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setChangeForm({
                        ...changeForm,
                        showNew: !changeForm.showNew,
                      })
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 cursor-pointer"
                  >
                    {changeForm.showNew ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={changeLoading}
                  className="w-full bg-red-500 text-white py-2 rounded cursor-pointer"
                >
                  {changeLoading ? <AuthButtonLoader /> : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => setChangeModal(false)}
                  className="w-full text-sm text-gray-500 cursor-pointer border py-2"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

// ProfileSkeleton remains unchanged
const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-stone-300 to-red-600 px-4 grid items-center">
    <div className="container rounded-xl">
      <div className="text-center mb-8">
        <div className="h-8 w-1/3 mx-auto bg-gray-300 rounded animate-pulse"></div>
        <div className="h-4 w-1/4 mx-auto bg-gray-300 rounded animate-pulse mt-2"></div>
      </div>

      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 bg-gradient-to-br from-amber-300 via-red-500 to-red-700 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <svg
                className="w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <pattern
                    id="p"
                    width="4"
                    height="4"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="2" cy="2" r="1" fill="white" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#p)" />
              </svg>
            </div>

            <div className="relative z-10 bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg w-full max-w-[240px]">
              <div className="w-32 h-32 rounded-full bg-gray-300 mx-auto mb-4 animate-pulse"></div>
              <div className="h-6 w-2/3 mx-auto bg-gray-300 rounded animate-pulse mb-4"></div>
              <div className="h-4 w-full bg-gray-300 rounded animate-pulse"></div>
              <div className="h-4 w-5/6 bg-gray-300 rounded animate-pulse mt-2"></div>
            </div>
          </div>

          <div className="md:w-2/3 p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="h-6 w-1/3 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-8 w-20 bg-gray-300 rounded animate-pulse"></div>
            </div>

            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600 mr-4">
                    <div className="w-5 h-5 bg-gray-300 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 w-1/4 bg-gray-300 rounded animate-pulse"></div>
                    <div className="h-6 w-3/4 bg-gray-300 rounded animate-pulse mt-2"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <div className="bg-red-300 h-10 w-24 rounded-md animate-pulse"></div>
            </div>
            <div className="mt-8 flex justify-end">
              <div className="h-10 w-32 bg-red-300 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
