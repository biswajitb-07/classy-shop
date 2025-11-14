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
  FiCamera,
  FiSave,
  FiX,
  FiLogOut,
  FiLock,
  FiCheck,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  useUpdateUserProfileMutation,
  useLogoutUserMutation,
  useLoadUserQuery,
  useSetPasswordMutation,
  useChangePasswordMutation,
} from "../../../features/api/authApi.js";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader.jsx";

// Enhanced Profile Skeleton (updated colors to match red theme)
const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-100 p-4">
    <div className="max-w-6xl mx-auto">
      {/* Header Skeleton */}
      <div className="text-center mb-12 pt-8">
        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
        <div className="h-12 w-80 mx-auto bg-gray-200 rounded-2xl animate-pulse mb-4"></div>
        <div className="h-6 w-64 mx-auto bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="mt-6 mx-auto w-32 h-1 bg-gray-200 rounded-full animate-pulse"></div>
      </div>

      {/* Main Card Skeleton */}
      <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        <div className="lg:flex">
          {/* Left Section Skeleton */}
          <div className="lg:w-2/5 bg-gradient-to-br from-gray-300 to-gray-400 p-8 relative overflow-hidden">
            <div className="flex flex-col items-center text-center h-full justify-center">
              <div className="w-40 h-40 bg-gray-200 rounded-full mb-8 animate-pulse"></div>
              <div className="h-8 w-48 bg-gray-200 rounded-2xl mb-4 animate-pulse"></div>
              <div className="w-full max-w-sm">
                <div className="h-6 w-24 bg-gray-200 rounded-xl mb-3 animate-pulse"></div>
                <div className="h-20 w-full bg-gray-200 rounded-2xl animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Right Section Skeleton */}
          <div className="lg:w-3/5 p-8 md:p-12">
            <div className="flex justify-between items-center mb-8">
              <div className="h-8 w-64 bg-gray-200 rounded-2xl animate-pulse"></div>
              <div className="h-12 w-32 bg-gray-200 rounded-2xl animate-pulse"></div>
            </div>

            <div className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded-xl mb-2 animate-pulse"></div>
                    <div className="h-6 w-full bg-gray-200 rounded-2xl animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex space-x-4">
              <div className="h-12 w-32 bg-gray-200 rounded-2xl animate-pulse"></div>
              <div className="h-12 w-40 bg-gray-200 rounded-2xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [newPwd, setNewPwd] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changeModal, setChangeModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [changeForm, setChangeForm] = useState({
    currentPassword: "",
    newPassword: "",
    showCurrent: false,
    showNew: false,
  });

  const navigate = useNavigate();

  const { data, isLoading: isUserLoading, error, refetch } = useLoadUserQuery();
  const [setPwd, { isLoading: pwdLoading }] = useSetPasswordMutation();
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
      village: "",
      city: "",
      district: "",
      state: "",
      postalCode: "",
      country: "India",
    },
  });

  useEffect(() => {
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
          village: defaultAddress.village || "",
          city: defaultAddress.city || "",
          district: defaultAddress.district || "",
          state: defaultAddress.state || "",
          postalCode: defaultAddress.postalCode || "",
          country: defaultAddress.country || "India",
        },
      });
    } else if (!isUserLoading) {
      navigate("/login");
    }
  }, [data, isUserLoading, navigate]);

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
            village: profile.address.village,
            city: profile.address.city,
            district: profile.address.district,
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

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (err) {
      toast.error(err?.data?.message || "Logout failed");
    }
  };

  const confirmLogout = () => {
    setLogoutModal(true);
  };

  const googlePasswordHandle = async (e) => {
    e.preventDefault();
    if (newPwd.length < 6) {
      toast.error("Password must be ≥ 6 chars");
      return;
    }
    try {
      await setPwd(newPwd).unwrap();
      toast.success("Password saved – you can now login with email");
      setNewPwd("");
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to set password");
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

  if (isUserLoading) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-pink-600 to-amber-600 pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-5 pt-5">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-600 to-pink-600 rounded-full mb-4">
            <FiUser className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            My Profile
          </h1>
          <p className="text-base sm:text-lg text-white font-medium">
            Manage your personal information and settings
          </p>
          <div className="mt-6 mx-auto w-32 h-1 rounded-full bg-gradient-to-r from-white to-pink-800"></div>
        </div>

        {/* Main Profile Card */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden hover:shadow-3xl transition-all duration-500">
          <div className="lg:flex">
            <div className="lg:w-2/5 bg-gradient-to-br from-red-400  to-pink-500 p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
                <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-20 -translate-y-20"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/5 rounded-full translate-x-20 translate-y-20"></div>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center h-full justify-center">
                {/* Profile Image */}
                <div className="relative group mb-8">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full border-4 border-white/30 shadow-2xl overflow-hidden bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm">
                    {profile?.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-4xl sm:text-5xl font-bold">
                        {profile?.name
                          ? profile.name.charAt(0).toUpperCase()
                          : "U"}
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <label className="absolute bottom-2 right-2 bg-white/90 hover:bg-white p-2 sm:p-3 rounded-full shadow-lg cursor-pointer transition-all duration-300 hover:scale-110">
                      <FiCamera className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

                {/* Name */}
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">
                  {profile.name || "User"}
                </h2>

                {/* Bio Section */}
                <div className="w-full max-w-sm">
                  <label className="block text-white/90 font-semibold mb-3 text-base sm:text-lg">
                    About Me
                  </label>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={profile.bio}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full bg-white/20 backdrop-blur-sm placeholder-white/70 text-white rounded-2xl px-4 py-3 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none text-sm sm:text-base"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-white/90 text-sm sm:text-base leading-relaxed bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                      {profile.bio || "No bio provided"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:w-3/5 p-8 md:p-12">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
                  <div className="w-2 h-8 bg-gradient-to-b from-red-500 to-pink-500 rounded-full mr-3"></div>
                  Personal Information
                </h3>
                <button
                  onClick={toggleEdit}
                  className={`flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 cursor-pointer text-sm sm:text-base ${
                    isEditing
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg"
                  }`}
                >
                  {isEditing ? (
                    <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <FiEdit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                  <span>{isEditing ? "Cancel" : "Edit Profile"}</span>
                </button>
              </div>

              <div className="space-y-6">
                {/* Name Field */}
                <div className="group">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-100 to-pink-100 rounded-2xl flex items-center justify-center group-hover:from-red-200 group-hover:to-pink-200 transition-all duration-300">
                      <FiUser className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={profile.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      ) : (
                        <p className="text-base sm:text-lg font-medium text-gray-800">
                          {profile.name || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Field */}
                <div className="group">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-100 to-amber-100 rounded-2xl flex items-center justify-center group-hover:from-pink-200 group-hover:to-amber-200 transition-all duration-300">
                      <FiMail className="w-6 h-6 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        Email Address
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          name="email"
                          value={profile.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          required
                        />
                      ) : (
                        <p className="text-base sm:text-lg font-medium text-gray-800">
                          {profile.email || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone Field */}
                <div className="group">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-2xl flex items-center justify-center group-hover:from-amber-200 group-hover:to-yellow-200 transition-all duration-300">
                      <FiPhone className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        Phone Number
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={profile.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                        />
                      ) : (
                        <p className="text-base sm:text-lg font-medium text-gray-800">
                          {profile.phone || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="group">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-100 to-amber-100 rounded-2xl flex items-center justify-center group-hover:from-red-200 group-hover:to-amber-200 transition-all duration-300">
                      <FiCalendar className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        Date of Birth
                      </label>
                      {isEditing ? (
                        <input
                          type="date"
                          name="dob"
                          value={profile.dob}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                        />
                      ) : (
                        <p className="text-base sm:text-lg font-medium text-gray-800">
                          {profile.dob
                            ? new Date(profile.dob).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="group">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-100 to-red-100 rounded-2xl flex items-center justify-center group-hover:from-pink-200 group-hover:to-red-200 transition-all duration-300">
                      <FiMapPin className="w-6 h-6 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs sm:text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        Address
                      </label>
                      {isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input
                            type="text"
                            name="village"
                            value={profile.address.village}
                            onChange={handleAddressChange}
                            placeholder="Village"
                            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          />
                          <input
                            type="text"
                            name="city"
                            value={profile.address.city}
                            onChange={handleAddressChange}
                            placeholder="City"
                            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          />
                          <input
                            type="text"
                            name="district"
                            value={profile.address.district}
                            onChange={handleAddressChange}
                            placeholder="District"
                            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          />
                          <input
                            type="text"
                            name="state"
                            value={profile.address.state}
                            onChange={handleAddressChange}
                            placeholder="State"
                            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          />
                          <input
                            type="text"
                            name="postalCode"
                            value={profile.address.postalCode}
                            onChange={handleAddressChange}
                            placeholder="Postal Code"
                            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          />
                          <input
                            type="text"
                            name="country"
                            value={profile.address.country}
                            onChange={handleAddressChange}
                            placeholder="Country"
                            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          />
                        </div>
                      ) : (
                        <p className="text-base sm:text-lg font-medium text-gray-800 leading-relaxed">
                          {profile.address.village
                            ? `${profile.address.village}, ${profile.address.city}, ${profile.address.district}, ${profile.address.state}, ${profile.address.postalCode}, ${profile.address.country}`
                            : "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Password Setting */}
              {data?.user?.isGoogleUser === false && data?.user?.googleId ? (
                <div className="mt-8 p-6 border-2 border-amber-200 rounded-3xl bg-gradient-to-r from-amber-50 to-yellow-50">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                      <FiLock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base sm:text-lg font-bold text-amber-800 mb-2">
                        Set Account Password
                      </h4>
                      <p className="text-amber-700 mb-4 text-xs sm:text-sm">
                        Add a password to enable email login for your account
                      </p>
                      <form
                        onSubmit={googlePasswordHandle}
                        className="flex items-center space-x-3"
                      >
                        <div className="flex-1 relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full px-4 py-3 bg-white border border-amber-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                            minLength={6}
                            disabled={pwdLoading}
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-amber-600 hover:text-amber-700"
                          >
                            {showPassword ? (
                              <FiEyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                            ) : (
                              <FiEye className="w-4 h-4 sm:w-5 sm:h-5" />
                            )}
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={pwdLoading}
                          className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold rounded-2xl hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 text-sm sm:text-base"
                        >
                          {pwdLoading ? <AuthButtonLoader /> : "Set Password"}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setChangeModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer text-sm sm:text-base"
                  >
                    <FiLock className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Change Password</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={confirmLogout}
                  disabled={logoutIsLoading || updateIsLoading}
                  className="flex items-center space-x-2 px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 cursor-pointer text-sm sm:text-base"
                >
                  <FiLogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>
                    {logoutIsLoading ? <AuthButtonLoader /> : "Logout"}
                  </span>
                </button>

                {isEditing && (
                  <button
                    onClick={handleSaveChanges}
                    disabled={updateIsLoading || logoutIsLoading}
                    className="flex items-center space-x-2 px-6 py-2 sm:px-8 sm:py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-2xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 cursor-pointer text-sm sm:text-base"
                  >
                    <FiSave className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>
                      {updateIsLoading ? <AuthButtonLoader /> : "Save Changes"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        {changeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-pink-600 p-6 text-white">
                <h2 className="text-xl sm:text-2xl font-bold text-center flex items-center justify-center space-x-2">
                  <FiLock className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>Change Password</span>
                </h2>
              </div>

              <form onSubmit={handleChangePwd} className="p-6 space-y-6">
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
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
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-600 hover:text-red-600"
                  >
                    {changeForm.showCurrent ? (
                      <FiEyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <FiEye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>

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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
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
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-600 hover:text-red-600"
                  >
                    {changeForm.showNew ? (
                      <FiEyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <FiEye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setChangeModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-all duration-300 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changeLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-2xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 text-sm sm:text-base"
                  >
                    {changeLoading ? <AuthButtonLoader /> : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Logout Confirmation Modal */}
        {logoutModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 text-white">
                <h2 className="text-xl sm:text-2xl font-bold text-center flex items-center justify-center space-x-2">
                  <FiLogOut className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>Confirm Logout</span>
                </h2>
              </div>

              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiLogOut className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-gray-600 mb-6 text-base sm:text-lg">
                  Are you sure you want to log out of your account?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setLogoutModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-all duration-300 text-sm sm:text-base cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={logoutIsLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 text-sm sm:text-base cursor-pointer"
                  >
                    {logoutIsLoading ? <AuthButtonLoader /> : "Yes, Logout"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
