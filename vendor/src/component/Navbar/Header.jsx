import { AiOutlineMenu } from "react-icons/ai";
import { IoNotifications } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../features/authSlice";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { isOpen, vendor } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <div
      className={`fixed top-0 right-0 left-0 flex items-center justify-between py-4 px-4 sm:px-5 bg-white shadow-md z-30 transition-all duration-300 ${
        isOpen ? "lg:ml-[18rem] lg:w-[calc(100%-18rem)]" : "w-full"
      }`}
    >
      <div className="flex items-center gap-7">
        <AiOutlineMenu
          onClick={() => dispatch(toggleSidebar())}
          className="text-2xl text-gray-700 cursor-pointer"
        />
        {!isOpen && (
          <img src="./logo.jpg" alt="Logo" className="w-28 md:w-40" />
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <IoNotifications className="text-xl text-gray-700 cursor-pointer" />
          <span className="absolute -bottom-1 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
            2
          </span>
        </div>
        {vendor?.photoUrl ? (
          <>
            <img
              onClick={() => navigate("/profile")}
              src={vendor.photoUrl}
              alt=""
              className="w-9 h-9 cursor-pointer rounded-full"
            />
          </>
        ) : (
          <>
            <div
              onClick={() => navigate("/profile")}
              className="w-9 h-9 rounded-full bg-blue-700 text-white flex items-center justify-center text-sm font-semibold cursor-pointer"
            >
              {vendor.name.charAt(0).toUpperCase()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Header;
