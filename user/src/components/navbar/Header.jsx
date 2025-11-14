import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import { LuMenu } from "react-icons/lu";
import { IoCartOutline } from "react-icons/io5";
import { FaBagShopping } from "react-icons/fa6";
import { useState } from "react";
import { useSelector } from "react-redux";
import {
  useGetCartQuery,
  useGetWishlistQuery,
} from "../../features/api/cartApi";
import Search from "../Search";
import Navigation from "./Navigation";
import CartPanel from "../shipping/CartPanel";

const Header = ({ visible, openCategoryPanel, isOpenCatPanel, categories }) => {
  const [isOpenCartPanel, setIsOpenCartPanel] = useState(false);

  const navigate = useNavigate();
  const { user } = useSelector((store) => store.auth);
  const { data: cartData } = useGetCartQuery();
  const { data: wishlistData } = useGetWishlistQuery();

  const cartCount = cartData?.cart?.length || 0;
  const wishlistCount = wishlistData?.wishlist?.length || 0;

  const openCartPanel = () => {
    setIsOpenCartPanel(!isOpenCartPanel);
  };

  return (
    <>
      <header
        className={`bg-white fixed top-0 z-30 w-full shadow-xs shadow-red-500/20 transition-transform duration-700 ease-in-out ${
          visible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        {/* first navbar */}
        <div className="top-strip py-2 border-[#eadddd] border-t-[1px] border-b-[1px] hidden lg:block">
          <div className="container">
            <div className="flex items-center justify-between">
              <div className="col1 w-[50%]">
                <p className="text-[12px] font-[500]">
                  Get up to 50% off new season styles, limited time only
                </p>
              </div>

              <div className="col2 flex items-center justify-end">
                <ul className="flex items-center gap-3 list-none">
                  <li>
                    <Link
                      to="/help-center"
                      className="text-[13px] link font-[500] transition duration-150 ease-linear"
                    >
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/order-tracking"
                      className="text-[13px] link font-[500] transition duration-150 ease-linear"
                    >
                      Order Tracking
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* second navbar */}
        <div className="header py-4 border-[#eadddd] border-t-[1px] border-b-[1px]">
          <div className="container flex items-center justify-between">
            <div
              onClick={openCategoryPanel}
              className="lg:hidden text-xl md:text-3xl cursor-pointer hover:text-red-500 transition duration-100 ease-linear"
            >
              <LuMenu />
            </div>

            <div className="col1 lg:w-[25%]">
              <Link>
                <img className="w-36 md:w-44 lg:w-48" src="/logo.jpg" />
              </Link>
            </div>

            <div className="col2 hidden lg:block w-[45%]">
              <Search />
            </div>

            {/* for mobile and tablet */}
            <div
              className="lg:hidden relative text-2xl md:text-3xl cursor-pointer hover:text-red-500 transition duration-100 ease-linear"
              onClick={openCartPanel}
            >
              <IoCartOutline />
              <span className="absolute -bottom-1 -left-1 md:-left-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold hover:bg-red-600 transition-colors duration-200">
                {cartCount}
              </span>
            </div>

            <div className="col3 w-[30%] hidden lg:flex items-center">
              <ul className="w-full flex items-center justify-end gap-3">
                {!user && (
                  <li className="list-none flex items-center gap-2 pl-3">
                    <Link
                      to="/login"
                      className="px-4 py-2 bg-gradient-to-r from-[#e47a7a] to-[#df3636] text-white text-[15px] font-bold rounded-full hover:from-[#e05a5a] hover:to-[#c72a2a] hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105"
                    >
                      Login
                    </Link>
                    <span className="text-gray-400">|</span>
                    <Link
                      to="/login"
                      className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-[15px] font-bold rounded-full hover:from-gray-600 hover:to-gray-700 hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105"
                    >
                      Register
                    </Link>
                  </li>
                )}

                {user && (
                  <li
                    onClick={() => navigate("/profile")}
                    className="cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200 ease-in-out group"
                  >
                    {user?.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.name || "User Profile"}
                        className="w-8 h-8 text-gray-600 hover:scale-105 transition-colors duration-200 ease-in-out rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center bg-red-600 text-white hover:text-white transition-colors duration-200 ease-in-out rounded-full text-lg font-semibold">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-[#ff5252] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                      Profile
                    </div>
                  </li>
                )}

                <li
                  onClick={() => navigate("/orders")}
                  className="relative cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200 ease-in-out group"
                >
                  <FaBagShopping className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors duration-200" />
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-[#ff5252] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Orders
                  </div>
                </li>

                {/* Heart Icon */}
                <li
                  onClick={() => navigate("/product-wishlist")}
                  className="relative cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200 ease-in-out group"
                >
                  <Heart className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors duration-200" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold hover:bg-red-600 transition-colors duration-200">
                    {wishlistCount}
                  </span>
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-[#ff5252] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Wishlist
                  </div>
                </li>

                {/* Shopping Cart */}
                <li
                  className="relative cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200 ease-in-out group"
                  onClick={openCartPanel}
                >
                  <ShoppingCart className="w-5 h-5 text-gray-600 hover:text-blue-500 transition-colors duration-200" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold hover:bg-red-600 transition-colors duration-200">
                    {cartCount}
                  </span>
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-[#ff5252] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Cart
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* third navbar */}
        <div className="lg:py-4">
          <Navigation
            openCategoryPanel={openCategoryPanel}
            isOpenCatPanel={isOpenCatPanel}
            categories={categories}
          />
        </div>
      </header>
      <CartPanel
        categories={categories}
        openCartPanel={openCartPanel}
        isOpenCartPanel={isOpenCartPanel}
      />
    </>
  );
};

export default Header;
