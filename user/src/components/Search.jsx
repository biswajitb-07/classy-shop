import { IoSearch } from "react-icons/io5";

const Search = () => {
  return (
    <div className="searchBox w-[100%] h-[50px] bg-[#e5e5e5] rounder-[5px] relative p-2">
      <input
        type="text"
        placeholder="Search for products..."
        className="w-full h-[35px] focus:outline-none p-2 bg-inherit text-[15px]"
      />

      <button className="absolute top-[7px] right-[5px] z-50 w-[37px] min-w-[37px] h-[37px] rounded-full text-black cursor-pointer hover:bg-gray-400 hover:shadow-lg hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out flex justify-center items-center">
        <IoSearch className="text-[#484141] text-[20px] hover:text-gray-700 transition-colors duration-300" />
      </button>
    </div>
  );
};

export default Search;
