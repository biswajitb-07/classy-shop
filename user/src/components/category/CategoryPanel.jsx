import { FiX } from "react-icons/fi";
import CategoryItem from "./CategoryItem.jsx";

const CategoryPanel = ({ openCategoryPanel, isOpenCatPanel, categories }) => {
  return (
    <>
      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-[18rem] 
          bg-white shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-scroll scrollbar-red
          ${isOpenCatPanel ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col justify-start gap-2 py-3 px-2">
          <div>
            <img src="../logo.jpg" alt="Logo" className="w-42" />
          </div>

          <div className="flex items-center justify-between px-3 py-4">
            <h2 className="text-lg font-semibold text-gray-500">
              Shop By Categories
            </h2>
            <button
              onClick={openCategoryPanel}
              className="text-white cursor-pointer transition duration-150 ease-linear hover:rotate-90 bg-red-500"
            >
              <FiX size={24} />
            </button>
          </div>

          <ul className="flex flex-col divide-y divide-gray-100">
            {categories.map((cat) => (
              <CategoryItem
                key={cat.name}
                category={cat}
                path=""
                openCategoryPanel={openCategoryPanel}
              />
            ))}
          </ul>
        </div>
      </aside>

      {/* Background Blur Overlay */}
      {isOpenCatPanel && (
        <div
          onClick={openCategoryPanel}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        ></div>
      )}
    </>
  );
};

export default CategoryPanel;
