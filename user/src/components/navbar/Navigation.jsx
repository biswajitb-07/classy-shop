import { RiMenu2Fill } from "react-icons/ri";
import { LiaAngleDownSolid } from "react-icons/lia";
import { Link, NavLink } from "react-router-dom";
import { GoRocket } from "react-icons/go";
import { useEffect } from "react";

const Navigation = ({ openCategoryPanel, isOpenCatPanel, categories }) => {
  useEffect(() => {
    const root = document.documentElement;
    if (isOpenCatPanel) {
      root.classList.add("overflow-hidden");
    } else {
      root.classList.remove("overflow-hidden");
    }

    return () => root.classList.remove("overflow-hidden");
  }, [isOpenCatPanel]);

  const getSlug = (str) => str.toLowerCase().replace(/\s+/g, "-");

  return (
    <>
      <nav className="hidden lg:block">
        <div className="container flex items-center justify-between gap-7 lg:gap-5">
          <div className="col1 w-[20%]">
            <button
              onClick={openCategoryPanel}
              className="flex items-center justify-center gap-4 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out hover:bg-gray-200 p-2 hover:text-red-500"
            >
              <RiMenu2Fill className="text-[18px]" />
              <p className="text-[13px] font-bold">SHOP BY CATEGORIES</p>
              <LiaAngleDownSolid className="text-[14px] ml-auto font-bold" />
            </button>
          </div>

          <div className="col2 w-[63%]">
            <ul className="flex items-center gap-3">
              <li className="list-none hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out">
                <Link
                  to="/"
                  className="link font-[500] text-[12px] md:text-[14px] bg-red-500 py-2 px-3 rounded-md !text-white"
                >
                  Home
                </Link>
              </li>

              {categories.length > 0 ? (
                categories.map((cat) => {
                  const slug = getSlug(cat.name);
                  const hasSub =
                    cat.subCategories && cat.subCategories.length > 0;
                  return (
                    <li
                      key={cat.name}
                      className={`list-none ${
                        hasSub
                          ? "dropdown-container relative"
                          : "hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out"
                      }`}
                    >
                      <NavLink
                        to={`/${slug}`}
                        className={({ isActive }) =>
                          `link font-[500] text-[12px] md:text-[14px] p-2 ${
                            isActive
                              ? "border-b-2 border-red-500"
                              : "hover:bg-gray-200"
                          }`
                        }
                      >
                        {cat.name}
                      </NavLink>
                      {hasSub && (
                        <div className="dropdown-menu hidden lg:block absolute top-0 mt-10 left-0 min-w-[200px] bg-white shadow-md z-10">
                          <ul className="list-none">
                            {cat.subCategories.map((sub) => {
                              const subSlug = getSlug(sub.name);
                              const hasThirdLevel =
                                sub.thirdLevelSubCategories &&
                                sub.thirdLevelSubCategories.length > 0;
                              return (
                                <li
                                  key={sub.name}
                                  className={
                                    hasThirdLevel
                                      ? "dropdown-container relative"
                                      : ""
                                  }
                                >
                                  <NavLink
                                    to={`/${slug}/${subSlug}`}
                                    className={({ isActive }) =>
                                      `block px-4 py-2 ${
                                        isActive
                                          ? "bg-red-500 text-white"
                                          : "hover:bg-gray-200"
                                      }`
                                    }
                                  >
                                    {sub.name}
                                  </NavLink>
                                  {hasThirdLevel && (
                                    <div className="third-level-menu absolute top-0 left-full min-w-[200px] bg-white shadow-md z-10">
                                      <ul className="list-none">
                                        {sub.thirdLevelSubCategories.map(
                                          (third) => {
                                            const thirdSlug = getSlug(
                                              third.name
                                            );
                                            return (
                                              <li key={third.name}>
                                                <NavLink
                                                  to={`/${slug}/${subSlug}/${thirdSlug}`}
                                                  className={({ isActive }) =>
                                                    `block px-4 py-2 ${
                                                      isActive
                                                        ? "bg-red-500 text-white"
                                                        : "hover:bg-gray-200"
                                                    }`
                                                  }
                                                >
                                                  {third.name}
                                                </NavLink>
                                              </li>
                                            );
                                          }
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })
              ) : (
                <CategorySkeleton count={7} />
              )}
            </ul>
          </div>

          <div className="col3 w-[20%]">
            <div className="text-sm font-[500] flex items-center justify-end gap-3 mb-0 mt-0">
              <GoRocket className="text-[18px] size" />
              <p className="hide-below-1220">Free International Delivery</p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;

const CategorySkeleton = ({ count = 5 }) => {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <li key={i} className="list-none animate-pulse">
          <div className="bg-gray-200 rounded-md h-8 w-24"></div>
        </li>
      ))}
    </>
  );
};
