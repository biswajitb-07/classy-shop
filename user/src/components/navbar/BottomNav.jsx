import {
  FaHome,
  FaSearch,
  FaRegHeart,
  FaClipboardList,
  FaUser,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const BottomNav = () => {
  const navigate = useNavigate();
  const { user } = useSelector((store) => store.auth);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center h-16 bg-white shadow-2xl lg:hidden">
      {/* Home */}
      <button
        onClick={() => navigate("/")}
        className="flex flex-col items-center text-gray-600 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out hover:text-red-500"
      >
        <FaHome size={22} />
        <span className="text-xs mt-1">Home</span>
      </button>

      {/* Search */}
      <button className="flex flex-col items-center text-gray-600 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out hover:text-red-500">
        <FaSearch size={22} />
        <span className="text-xs mt-1">Search</span>
      </button>

      {/* Wishlist */}
      <button
        onClick={() => navigate("/product-wishlist")}
        className="flex flex-col items-center text-gray-600 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out hover:text-red-500"
      >
        <FaRegHeart size={22} />
        <span className="text-xs mt-1">Wishlist</span>
      </button>

      {/* Orders */}
      <button onClick={() => navigate("/orders")} className="flex flex-col items-center text-gray-600 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out hover:text-red-500">
        <FaClipboardList size={22} />
        <span className="text-xs mt-1">Orders</span>
      </button>

      {/* Account */}
      <button
        onClick={() => navigate("/profile")}
        className="flex flex-col items-center text-gray-600 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out hover:text-red-500"
      >
        {user?.photoUrl ? (
          <>
            <img
              src={user.photoUrl}
              alt=""
              className="w-8 h-8 text-gray-600 hover:scale-105 transition-colors duration-200 ease-in-out rounded-full"
            />
          </>
        ) : (
          <>
            <FaUser size={22} />
            <span className="text-xs mt-1">Account</span>
          </>
        )}
      </button>
    </nav>
  );
};

export default BottomNav;
