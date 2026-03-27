import { useState } from "react";
import { FaPlus, FaMinus } from "react-icons/fa6";
import { Link } from "react-router-dom";

const CategoryItem = ({ category, path = "", openCategoryPanel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const subcats =
    category.subCategories || category.thirdLevelSubCategories || [];
  const hasSubcategories = subcats.length > 0;

  const currentPath = `${path}/${category.name
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  return (
    <li className="px-4 py-2 flex flex-col">
      <div className="flex items-center justify-between">
        <Link
          to={currentPath}
          onClick={openCategoryPanel}
          className="text-sm font-bold text-gray-700 hover:text-red-600"
        >
          {category.name}
        </Link>

        {hasSubcategories && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-500 border border-red-600 p-0.5 cursor-pointer transition duration-150 ease-in-out hover:scale-110 active:scale-90"
          >
            {isOpen ? <FaMinus size={10} /> : <FaPlus size={10} />}
          </button>
        )}
      </div>

      <div
        className={`overflow-hidden transition-all duration-400 ease-in-out ${
          isOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
        }`}
      >
        {hasSubcategories && (
          <ul className="pl-4 border-l border-gray-400">
            {subcats.map((sub) => (
              <CategoryItem key={sub.name} category={sub} path={currentPath} openCategoryPanel={openCategoryPanel} />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
};

export default CategoryItem;
