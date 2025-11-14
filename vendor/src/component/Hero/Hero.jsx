import { AiOutlinePlus } from "react-icons/ai";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="bg-[#f1faff] rounded-md border border-gray-200 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 w-full">
      {/* Left */}
      <div className="space-y-3 md:space-y-4 text-center md:text-left">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
          Welcome,
          <br />
          <span className="text-blue-600 text-2xl sm:text-3xl md:text-4xl">
            rapid
          </span>
        </h1>
        <p className="text-gray-700 text-sm sm:text-base">
          Here’s what’s happening on your store today. See the statistics at
          once.
        </p>
        <Link to="/add-product">
          <button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 px-4 py-2 cursor-pointer rounded shadow-sm text-sm mx-auto md:mx-0">
            <AiOutlinePlus />
            Add Product
          </button>
        </Link>
      </div>

      {/* Right image */}
      <div className="w-full md:w-60">
        <img
          src="./login/hero-1.webp"
          alt="Welcome Illustration"
          className="w-full h-auto mx-auto md:mx-0"
        />
      </div>
    </div>
  );
};

export default Hero;
